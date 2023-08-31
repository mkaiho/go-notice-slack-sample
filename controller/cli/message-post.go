package cli

import (
	"log"
	"os"

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

func (e *messagePostCommand) Execute() {
	if len(os.Getenv("AWS_LAMBDA_RUNTIME_API")) > 0 {
		lambda.Start(e.execute)
	} else {
		if err := e.rootCmd.Execute(); err != nil {
			os.Exit(1)
		}
	}
}

func (e *messagePostCommand) execute(req MessagePostCommandRequest) error {
	log.Println(req.Message)

	return nil
}

func (e *messagePostCommand) initRootCommand() {
	var req MessagePostCommandRequest
	e.rootCmd = cobra.Command{
		Use:   "message-post",
		Short: "post message to slack",
		Long:  "Post message to slack.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return e.execute(req)
		},
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	e.rootCmd.PersistentFlags().StringVar(&req.Message, "message", "", "usage")
	e.rootCmd.MarkPersistentFlagRequired("message")
}
