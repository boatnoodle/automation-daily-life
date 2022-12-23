require('dotenv').config()
const functions = require("@google-cloud/functions-framework");
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");
const { WebClient } = require("@slack/web-api");

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const USER_OAUTH_TOKEN_SLACK = process.env.USER_OAUTH_TOKEN_SLACK

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const slackWebClient = new WebClient(USER_OAUTH_TOKEN_SLACK);

async function sendMessageToSlack(req, res) {
  const today = new Date();
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data, error } = await supabase
    .from("clickup-task-update-webhook")
    .select("*")
    .lt("created_at", today.toISOString())
    .gt("created_at", yesterday.toISOString());

  let doing_content_block = "";
  let done_content_block = "";
   
  for (const each of data) {
    const response = await fetch(
      `https://api.clickup.com/api/v2/task/${each.task_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": '"application/json"',
          Authorization: process.env.CLICK_UP_API_KEY,
        },
      }
    );
    const task = await response.json();
    if (!task.err && task.status.status === "in progress") {
      doing_content_block += "• " + task.name + ` ${task.url}` + "\n\n";
    } 

    if (!task.err && task.status.status === "done") {
      done_content_block += "• " + task.name + ` ${task.url}` + "\n\n";
    }
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "👋 Good morning my team this message has been generated from my scheduler. And my updates are following.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "✅ DONE\n\n" +
          done_content_block +
          "\n\n\n 🏗️ DOING\n\n" +
          doing_content_block,
      },
    },
  ];

  slackWebClient.chat.postMessage({
    channel: "#daily-meeting",
    blocks,
  });

  res.send("OK");
}

async function manageClickUpWebhook(req, res) {
  if (req.method === "POST") {
    const data = req.body;
    if (data) {
      const { event, history_items, task_id, webhook_id } = data;
      if (event !== "taskStatusUpdated"){
        console.log("This event does not support")
        res.send("OK")
      }

      const { user, before, after } = history_items[0];
      if (user.id === 3665453 && user.email === "nattasit@futuremakers.co.th"){
        if (after.status === "in progress" || after.status === "done") {
          const { data, error } = await supabase
            .from("clickup-task-update-webhook")
            .select("*")
            .eq("task_id", task_id);
  
          if (data.length > 0) {
            await supabase
              .from("clickup-task-update-webhook")
              .update({ status: after.status })
              .eq("task_id", task_id);
          } else {
            await supabase
              .from("clickup-task-update-webhook")
              .insert({ task_id, event, webhook_id, status: after.status });
          }
        } else {
          console.log("This status we don't care about")
          res.send("OK");
        }
      }
    }
  }

  res.send("OK");
}

functions.http("sendMessageToSlack", sendMessageToSlack);

functions.http("manageClickUpWebhook", manageClickUpWebhook);

module.exports = {
  sendMessageToSlack,
  manageClickUpWebhook,
};
