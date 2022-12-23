const functions = require("@google-cloud/functions-framework");
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");
const { WebClient } = require("@slack/web-api");

const SUPABASE_URL = "https://euygtomxdupnmvsyvbud.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eWd0b214ZHVwbm12c3l2YnVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3MTY2NzkxMSwiZXhwIjoxOTg3MjQzOTExfQ.CXIXNfLrfGgmKZ4SmXePrEvenSl8OKY3xmVFRE5qrjA";
const USER_OAUTH_TOKEN_SLACK =
  "xoxp-887407938822-872418203922-4549019594038-2ad5c371ce1a3013f10e1846fed6cf79";

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
          Authorization: "pk_3665453_9WVOB8EUVLZFEDJ4B711MM51CPRCKUSO",
        },
      }
    );
    const task = await response.json();

    if (task.status.status === "in progress") {
      doing_content_block += "• " + task.name + ` ${task.url}` + "\n\n";
    } 

    if (task.status.status === "done") {
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
      if (user.id !== 3665453 && user.email === "nattasit@futuremakers.co.th"){
        console.log("This user is not me")
        res.send("OK");
      }

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

  res.send("OK");
}

functions.http("sendMessageToSlack", sendMessageToSlack);

functions.http("manageClickUpWebhook", manageClickUpWebhook);

module.exports = {
  sendMessageToSlack,
  manageClickUpWebhook,
};