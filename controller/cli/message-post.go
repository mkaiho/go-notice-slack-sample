package cli

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/spf13/cobra"
)

func NewMessagePostCommand() *messagePostCommand {
	messagePostCommand := messagePostCommand{}
	messagePostCommand.initRootCommand()

	return &messagePostCommand
}

type MessagePostCommandRequest struct {
	Message string `json:"message"`
}

type messagePostCommand struct {
	rootCmd cobra.Command
}

func (c *messagePostCommand) Execute() {
	if len(os.Getenv("AWS_LAMBDA_RUNTIME_API")) > 0 {
		lambda.Start(c.handle)
	} else {
		if err := c.rootCmd.Execute(); err != nil {
			os.Exit(1)
		}
	}
}

func (c *messagePostCommand) execute(req MessagePostCommandRequest) error {
	log.Println(req.Message)
	return nil
}

func (c *messagePostCommand) handle(e events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req MessagePostCommandRequest
	err := json.Unmarshal([]byte(e.Body), &req)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       "invalid json format",
		}, err
	}

	if err := c.execute(req); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       http.StatusText(http.StatusInternalServerError),
		}, err
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
	}, nil
}

func (c *messagePostCommand) initRootCommand() {
	var req MessagePostCommandRequest
	c.rootCmd = cobra.Command{
		Use:   "message-post",
		Short: "post message to slack",
		Long:  "Post message to slack.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return c.execute(req)
		},
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	c.rootCmd.PersistentFlags().StringVar(&req.Message, "message", "", "usage")
	c.rootCmd.MarkPersistentFlagRequired("message")
}
