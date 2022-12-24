require("dotenv").config();
const functions = require("@google-cloud/functions-framework");
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");
const { WebClient } = require("@slack/web-api");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USER_OAUTH_TOKEN_SLACK = process.env.USER_OAUTH_TOKEN_SLACK;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const slackWebClient = new WebClient(USER_OAUTH_TOKEN_SLACK);

function isWeekend(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getTaskPointMessage(point) {
  switch (point) {
    case 1:
      return "[Task Point: 1 😆]";
    case 2:
      return "[Task Point: 2 😁]";

    case 3:
      return "[Task Point: 3 😙]";

    case 5:
      return "[Task Point: 5 😠]";

    case 7:
      return "[Task Point: 7 🤯]";

    default:
      return "";
  }
}

async function sendMessageToSlack(req, res) {
  let doing_content_block = "";
  let done_content_block = "";

  //* For in progress tasks
  const response = await fetch(
    `https://api.clickup.com/api/v2/team/${process.env.CLICK_UP_TEAM_ID}/task?statuses=in%20progress&statuses=in%20progress&assignees=${process.env.CLICK_UP_USER_ID}&assignees=${process.env.CLICK_UP_USER_ID}`,
    {
      method: "GET",
      headers: {
        "Content-Type": '"application/json"',
        Authorization: process.env.CLICK_UP_API_KEY,
      },
    }
  );

  const inprogress_tasks = await response.json();

  if (!inprogress_tasks.err && inprogress_tasks.tasks.length > 0) {
    for (const task of inprogress_tasks.tasks) {
      doing_content_block +=
        "• " +
        getTaskPointMessage(task.points) +
        " " +
        task.name +
        ` ${task.url}` +
        "\n\n";
    }
  }

  //* For done tasks
  const today = new Date();
  let passed_day = new Date();
  const dayOfWeek = today.getDay();

  if (dayOfWeek === 1) {
    //* this is Monday so should get done task backward for 2 days which is Friday.
    passed_day.setDate(passed_day.getDate() - 2);
  } else {
    passed_day.setDate(passed_day.getDate() - 1);
  }

  const { data, error } = await supabase
    .from("clickup-task-update-webhook")
    .select("*")
    .lt("created_at", today.toISOString())
    .gt("created_at", passed_day.toISOString());

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
    if (!task.err && task.status.status === "done") {
      done_content_block +=
        "• " +
        getTaskPointMessage(task.points) +
        " " +
        task.name +
        ` ${task.url}` +
        "\n\n";
    }
  }

  //* Create blocks message for Slack
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: isWeekend(today)
          ? "🎉 This is weekend. Hope you guys enjoy with this holiday krub."
          : "👋 Good morning my team. This message has been generated from my scheduler. And my updates are following.",
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
      if (event !== "taskStatusUpdated") {
        console.log("This event does not support");
        res.send("OK");
      }

      const { user, before, after } = history_items[0];
      if (user.id === 3665453 && user.email === "nattasit@futuremakers.co.th") {
        if (after.status === "todo" || after.status === "done") {
          const { data, error } = await supabase
            .from("clickup-task-update-webhook")
            .select("*")
            .eq("task_id", task_id);

          if (data.length > 0) {
            if (after.status === "todo") {
              await supabase
                .from("clickup-task-update-webhook")
                .delete()
                .eq("task_id", task_id);
            } else {
              await supabase
                .from("clickup-task-update-webhook")
                .update({ status: after.status })
                .eq("task_id", task_id);
            }
          } else if(after.status === "done") {
            await supabase
              .from("clickup-task-update-webhook")
              .insert({ task_id, event, webhook_id, status: after.status });
          }
        } else {
          console.log("This status we don't care about");
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
