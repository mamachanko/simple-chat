import {Page} from './src/state';

export default [
	{text: `
Welcome to cfpush ☁️  

An interactive Cloud Foundry tutorial in your terminal

We will be exploring <Text bold>Cloud Foundry</Text> and cloud-native computing by deploying a real chat application to Cloud Foundry.
`, command: 'echo ok let\'s go!'},

	{text: `
To begin, we should login.

When logging in we must identify the specific Cloud Foundry that we want to target. All the commands we run after that will run against that Cloud Foundry.

In our case, we'll log into Pivotal Web Services using its Single Sign-On. Once prompted, go to your browser, login and copy the temporary auth code.
`, command: 'cf login -a api.run.pivotal.io --sso'},

	{text: `
We need somewhere to deploy our apps to.

Let's create a new space for this tutorial.
`, command: 'cf create-space cfpush-tutorial'},

	{text: `
We have created a new space. But we still have to set it as our current target.
`, command: 'cf target -s cfpush-tutorial'},

	{text: `
We are ready for deployment. Let's start with the frontend, the $(bold "chat-app").

It is a Javascript React application that continuously polls a $(bold "message-service") for messages and allows to send new ones. It expects the $(bold "message-service") on its own host at $(underline "/api").

And like any Javascript browser application, the $(bold "chat-app") is a collection of static files, a "bundle". We zipped our bundle into a zipfile located at $(underline "./builds/chat-app.zip"). Since we simply want to serve static files, we will use the "staticfile_buildpack" for running the app.

We push the app by pointing the cli at $(underline "./builds/chat-app.zip"), selecting the buildpack and letting Cloud Foundry pick a random available route for us.
`, command: 'cf push chat-app -p ../builds/chat-app.zip -b staticfile_buildpack --random-route'},

	{text: `
Congratulations you have successfully deployed an application to Cloud Foundry!

The $(bold "chat-app") is served at

	$(underline https://{{CHAT_APP_URL}})

Before we start to use it, let's inspect the app.
`, command: 'cf app chat-app'},

	{text: `
You can see that 1 instance of the app is running. It has the default 1GB of memory and 1GB of disk. That is more than we need for a staticfile app. Let's scale things down. Memory should be 64M and disk 128M.

This is called vertical scaling. Whenever scaling an app vertically Cloud Foundry has to restart it. This involves downtime. For now we're ok with that, so we add '-f'.
`, command: 'cf scale chat-app -m 64M -k 128M -f'},

	{text: `
Now let's open the application at

    $(underline https://{{CHAT_APP_URL}})

You should see that the app "failed to load any messages". Oh dear! That's because its backend - the $(bold message-service) - isn't running yet. But the $(bold "chat-app") is a good Cloud-citizen and handles issues with its downstream dependencies gracefully. That's an essential property of any cloud-native application.

Let's avert this misery and deploy the $(bold "message-service"). It's a Java Spring Boot web application that exposes two endpoints:

    GET  $(underline "/api/messages") : returns the list of messages
    POST $(underline "/api/messages") : creates a new message

If it does not have a database attached it will run with an in-memory database.
It is packaged into a JAR file located at $(underline "./builds/message-service").

Again, we push by letting Cloud Foundry pick a random available route for us and pointing at the $(bold "message-service") JAR.
`, command: 'cf push message-service -p ../builds/message-service.jar --random-route'},

	{text: `
The $(bold "message-service") is deployed and served at

    $(underline https://{{MESSAGE_SERVICE_URL}})

We have both the $(bold "chat-app") and the $(bold "message-service") deployed now. However, when we visit

    $(underline https://{{CHAT_APP_URL}})

it still fails to load any messages. See for yourself.

Why is that?

In order to understand we must look at how traffic is currently routed.
`, command: 'cf routes'},

	{text: `
The $(bold "chat-app") is served at $(underline {{CHAT_APP_URL}})
The $(bold "message-service") is served at  $(underline {{MESSAGE_SERVICE_URL}})

The $(bold "chat-app") expects to reach the $(bold "message-service") at $(underline {{CHAT_APP_URL}}/api).
Mind the path $(underline "/api"). That's the problem!

Cloud Foundry's path-based routing to the rescue.

Let's map the route $(underline {{CHAT_APP_URL}}/api) to the $(bold "message-service").
`, command: 'cf map-route message-service cfapps.io --hostname {{chat-app.hostname}} --path /api'},

	{text: `
Hooray! The error is gone. The $(bold "chat-app") says there are no messages.

It's time to take out your phone. Go to

    $(underline https://{{CHAT_APP_URL}})

and chat away!

However, the more users there are the more load will our $(bold "message-service") have. At this moment we only have one instance of it running. We need more!

Adding more instances is called horizontal scaling. This does not require a restart and is almost instantaneous.

Let's scale out to 3. Planet scale!
`, command: 'cf scale message-service -i 3'},

	{text: `
This is weird. As we're using the $(bold chat-app) and sending messages, the message list keeps changing.

Why is that? As we haven't provided the $(bold message-service) with a database, it is running with an in-memory database. That means each instance has its own state. And every time we post or get messages we hit another instance, hence the inconsistency.

This setup is violating the idea of 'stateless processes' according to the twelve-factor app ($(underline "https://12factor.net/processes")).

Since Cloud Foundry might relocate instances in the cloud as it sees fit we might lose messages at any moment.

We need a database. Let's browse the marketplace.
`, command: 'cf marketplace'},

	{text: `
We can see there are plenty of services on offer, e.g.

    * Redis
    * Elasticsearch
    * Sendgrid
    * MongoDB
    * app-autoscaler
    * ...

Every service is available with different plans. Some are free, some incur cost. Let's ask Cloud Foundry to give us a database.

$(underline Elephantsql.com) offers Postgres as a service and is available in the marketplace. Let's find out more about its plans.
`, command: 'cf marketplace -s elephantsql'},

	{text: `
The smallest plan - $(bold turtle) - provides 4 concurrent connections, 20MB Storage and is free. Just what we need!

Let's create an $(bold elephantsql) instance using the $(bold turtle) plan and name it "$(bold database)".
`, command: 'cf create-service elephantsql turtle database'},

	{text: `
"The Postgres instance is ready.

We still need to connect it to the $(bold "message-service"). In Cloud Foundry terms this called binding.

When we bind a service to an app Cloud Foundry will provide all the necessary information to the app as environment variables. In this case it will provide a JDBC connection string to the $(bold "message-service").
`, command: 'cf bind-service message-service database'},

	{text: `
But that's not all. We have to restart the $(bold "message-service").

Since we're using Spring Boot it will will automatically pick up the database.

Caveat: In this case it is enough to just restart the application. In other cases we need to restage it for the changes to take effect (see $(underline "https://docs.cloudfoundry.org/devguide/deploy-apps/start-restart-restage.html")).
`, command: 'cf restart message-service'},

	// Smoke test

	{text: `
As the instances of the $(bold "message-service") have restarted they are all using the database as a backing service. They no longer carry state. We can scale the message-service to our heart's content. The users of the chat will have a consistent experience, whether we have 1 or 100 instances running.

"May I present to you: the internet!" ($(underline https://youtu.be/iDbyYGrswtg))

But where's the proof? How can we tell that all incoming traffic is really distributed across all instances of the $(bold message-service)?

Luckily, Cloud Foundry's $(bold loggregator) collects all application logs. It annotates every logged line with the type of process and app instance, e.g. [APP/PROC/WEB/2].

When inspecting the recent logs with a little help from grep we should see instances 0 - 2 logging equally often.
`, command: 'cf logs --recent message-service'}, // | grep GET | grep '\[APP\/PROC\/WEB\/\d\+\]''

	{text: `
Once you're finished playing with the $(bold chat-app), let's clean up. If we don't want incur further cost against our PWS quota, we should decommission all apps and services.

The easiest way to achieve that is to delete the entire space.
`, command: 'cf delete-space cfpush-tutorial -f'},

	{text: `
🏁 That's all for now. 🏁

Expect updates to this tutorial. Thank you for coming this far!

Your feedback is valued. If there is anything I can do to improve your experience, please, let me know. Give the repository a star, open an issue or send a PR.

$(underline "github.com/mamachanko/cfpush")

There's more: $(underline "https://docs.cloudfoundry.org/#read-the-docs")

Let's log you out. Bye bye!	
`, command: 'cf logout'}
] as ReadonlyArray<Page>;
