package main

import (
	"github.com/mkaiho/go-notice-slack-sample/controller/cli"
)

func main() {
	cli.NewMessagePostCommand().Execute()
}
