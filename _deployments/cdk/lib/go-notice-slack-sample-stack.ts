import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

interface StageContext {
  name: string
}

export class GoNoticeSlackSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env: string = this.node.tryGetContext("env");
    const context: StageContext = { ...this.node.tryGetContext(env), name: "go-notice-slack-sample" };
    const revision = require("child_process")
      .execSync("git rev-parse HEAD")
      .toString()
      .trim();

    /**
     * VPC
     */
    const vpc = new ec2.CfnVPC(this, `${context.name}-vpc`, {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      cidrBlock: "10.0.0.0/16",
      tags: [
        {
          key: "Name",
          value: `${context.name}-vpc`,
        },
      ],
    })
    const ipv6Cidr = new ec2.CfnVPCCidrBlock(this, 'IPv6Cidr', {
      vpcId: vpc.ref,
      amazonProvidedIpv6CidrBlock: true,
    });
    const vpcIpv6CidrBlock = cdk.Fn.select(0, vpc.attrIpv6CidrBlocks);
    const ipv6Cidrs = cdk.Fn.cidr(vpcIpv6CidrBlock, 256, "64");

    /**
     * Gateway
     */
    const igw = new ec2.CfnInternetGateway(this, `${context.name}-igw`, {
      tags: [
        {
          key: "Name",
          value: `${context.name}-igw`,
        },
      ],
    })
    new ec2.CfnVPCGatewayAttachment(this, `${context.name}-igw-attachment`, {
      vpcId: vpc.ref,
      internetGatewayId: igw.ref,
    })

    /**
     * Route Table
     */
    const publicRouteTable = new ec2.CfnRouteTable(this, `${context.name}-route-table-public`, {
      vpcId: vpc.ref,
      tags: [
        {
          key: "Name",
          value: `${context.name}-route-table-public`,
        },
      ]
    })
    new ec2.CfnRoute(this, `${context.name}-route-public`, {
      routeTableId: publicRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igw.ref,
    })
    new ec2.CfnRoute(this, `${context.name}-route-v6-public`, {
      routeTableId: publicRouteTable.ref,
      destinationIpv6CidrBlock: "::/0",
      gatewayId: igw.ref,
    })
    const privateRouteTable = new ec2.CfnRouteTable(this, `${context.name}-route-table-private`, {
      vpcId: vpc.ref,
      tags: [
        {
          key: "Name",
          value: `${context.name}-route-table-private`,
        },
      ]
    })

    /**
     * Subnet
     */
    const appAvailabilityZones = ["ap-northeast-1a", "ap-northeast-1c"]
    const appPublicSubnets = appAvailabilityZones.map((az, i) => {
      const azSuffix = az.replace(/^.*-/, "")
      const subnet = new ec2.CfnSubnet(this, `${context.name}-app-public-subnet-${azSuffix}`, {
        vpcId: vpc.ref,
        cidrBlock: `10.0.${i + 1}.0/24`,
        ipv6CidrBlock: cdk.Fn.select(i, ipv6Cidrs),
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        // ipv6Native: true,
        assignIpv6AddressOnCreation: true,
        tags: [
          {
            key: "Name",
            value: `${context.name}-app-public-subnet-${azSuffix}`,
          },
        ],
      })
      subnet.addDependency(ipv6Cidr)
      subnet.node.tryRemoveChild('RouteTableAssociation')
      subnet.node.tryRemoveChild('RouteTable')
      new ec2.CfnSubnetRouteTableAssociation(this, `${context.name}-route-association-public-${azSuffix}`, {
        subnetId: subnet.ref,
        routeTableId: publicRouteTable.ref,
      })
      return subnet
    })
    const appPrivateSubnets = appAvailabilityZones.map((az, i) => {
      const azSuffix = az.replace(/^.*-/, "")
      if (!cdk.Fn.select(i + appPublicSubnets.length, ipv6Cidrs)) {
        throw new Error("ipv6Cidrs is nothing")
      }
      const subnet = new ec2.CfnSubnet(this, `${context.name}-app-private-subnet-${azSuffix}`, {
        vpcId: vpc.ref,
        cidrBlock: `10.0.${i + 11}.0/24`,
        ipv6CidrBlock: cdk.Fn.select(i + appPublicSubnets.length, ipv6Cidrs),
        availabilityZone: az,
        assignIpv6AddressOnCreation: true,
        tags: [
          {
            key: "Name",
            value: `${context.name}-app-private-subnet-${azSuffix}`,
          },
        ],
      })
      subnet.addDependency(ipv6Cidr)
      subnet.node.tryRemoveChild('RouteTableAssociation')
      subnet.node.tryRemoveChild('RouteTable')
      new ec2.CfnSubnetRouteTableAssociation(this, `${context.name}-route-association-private-${azSuffix}`, {
        subnetId: subnet.ref,
        routeTableId: privateRouteTable.ref,
      })
      return subnet
    })

    const keyPair = new ec2.CfnKeyPair(this, `${context.name}-bastion-key-pair`, {
      keyName: `${context.name}-bastion-key-pair`,
    })
    keyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    new cdk.CfnOutput(this, `${context.name}-get-bastion-key-command`, {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.getAtt('KeyPairId')} --region ${this.region} --with-decryption --query Parameter.Value --output text`,
    })
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });
    const instanceSg = new ec2.CfnSecurityGroup(this, `${context.name}-bastion-sg`, {
      vpcId: vpc.ref,
      groupDescription: `security group for bastion instance in ${context.name}`,
      groupName: `${context.name}-bastion-sg`,
      tags: [
        {
          key: "Name",
          value: `${context.name}-bastion-sg`,
        },
      ],
    })
    new ec2.CfnSecurityGroupIngress(this, `${context.name}-bastion-sg-ingress-ssh`, {
      groupId: instanceSg.ref,
      cidrIp: '0.0.0.0/0',
      ipProtocol: ec2.Protocol.TCP,
      fromPort: 22,
      toPort: 22,
    })
    new ec2.CfnSecurityGroupIngress(this, `${context.name}-bastion-sg-ingress-v6-ssh`, {
      groupId: instanceSg.ref,
      cidrIpv6: '::/0',
      ipProtocol: ec2.Protocol.TCP,
      fromPort: 22,
      toPort: 22,
    })
    new ec2.CfnInstance(this, `${context.name}-bastion`, {
      subnetId: appPublicSubnets[0].ref,
      availabilityZone: this.availabilityZones[0],
      imageId: ami.getImage(this).imageId,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO).toString(),
      tags: [
        {
          key: "Name",
          value: `${context.name}-bastion`,
        },
      ],
      securityGroupIds: [
        instanceSg.ref,
      ],
      keyName: keyPair.keyName,
    })

    // Lambda
    const fnName = "message-post"
    const fn = new lambda.Function(this, `${context.name}-${fnName}`, {
      functionName: `${context.name}-${fnName}`,
      code: lambda.AssetCode.fromAsset(`../zip/cmd/${fnName}.zip`),
      handler: fnName,
      runtime: lambda.Runtime.PROVIDED_AL2,
    })
    new logs.LogGroup(this, `${context.name}-${fnName}-log`, {
      logGroupName: `/aws/lambda/${context.name}-${fnName}`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const restApi = new apigateway.RestApi(this, `${context.name}-api`, {
      restApiName: `${context.name}`,
    })
    const restMessagePost = restApi.root.addResource(`${fnName}`)
    restMessagePost.addMethod(
      "POST",
      new apigateway.LambdaIntegration(fn)
    )
  }
}
