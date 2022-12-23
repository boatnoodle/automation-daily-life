# automation-daily-life
## ⭐️ Inspiration
As I have to update my daily tasks everyday in my office’s Slack, I'm tedious to bring finished tasks from ClickUp to update in Slack, moreover I always forget what I'm done Yesterday. That's why I implemented this application to help me doing a boring stuff.

## ✅ What I have done
Since, I want some automation tools to do some kind of job for me, so I had been thinking for a while which any tools I have to use and it ended up following by these.
- Google Cloud Run - to create function without setting server because it's serverless and it has free tier.
- Google Cloud Scheduler - because I want my function to be triggered every 09.30AM which is a time I update daily task.
- Supabase - It's a database manager come with a Postgres for free. It's powerful and easy to setup a db within a minute.
- ClickUp API - I have to get a detail of tasks that have been updated status along the day and save it into the db. So, in another day, I can use the task's detail for reporting.
- Slack API - In order to update tasks to Slack, I have to use a `chat.postMessage` from Slack api.

## 🏆 What I got
From now on, I don't have to keep updating tasks by myself. I just change a status on ClickUp which I do it normally. And in the next day, my automation will bring those tasks from yesterday, come with a pretty message and update it at daily channel every 09.30AM.  
