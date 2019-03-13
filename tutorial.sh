#!/usr/bin/env bash

set -eo pipefail

cd $(dirname $0)

CI=${CI:-false}
DRY=${DRY:-false}

BLUE_ON_WHITE=`tput setab 7 && tput setaf 4`
WHITE_ON_BLUE=`tput setab 4 && tput setaf 7`
UNTIL_EOL=`tput el`
UNDERLINE=`tput smul`
BOLD=`tput bold`
RESET_UNDERLINE=`tput rmul`
RESET_STYLES=`tput sgr0`

CHAT_APP_URL="<if_you_see_this_the_chat-app_url_was_not_parsed_yet>"
CHAT_APP_HOSTNAME="<if_you_see_this_the_chat-app_hostname_was_not_parsed_yet>"
MESSAGE_SERVICE_URL="<if_you_see_this_the_message-service_url_was_not_parsed_yet>"

function prettyEcho() {
    echo "$1" \
    | fold -w 80 -s \
    | sed "s/^\(.*\)$/${BLUE_ON_WHITE}    \1${UNTIL_EOL}${RESET_STYLES}/"
}

function underline() {
    echo "${UNDERLINE}$1${RESET_UNDERLINE}"
}

function bold() {
    echo "${BOLD}$1${RESET_STYLES}${BLUE_ON_WHITE}"
}


function ensureCfInstalled() {
    if [[ ${DRY} != "false" ]] || command cf > /dev/null 2>&1 ; then
        : # noop
    else
        prettyEcho ""
        prettyEcho "The \"cf\" cli seems to be missing."
        prettyEcho ""
        prettyEcho "Learn how to install it at:"
        prettyEcho ""
        prettyEcho "    https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
        prettyEcho ""
        prettyEcho "Once you've installed it, come back. We'll be getting a coffee in the meantime."
        prettyEcho ""
        exit 1
    fi
}

function attemptLogIntoPWS() {
    if [[ ${DRY} != "false" ]]; then
        return
    fi

    if [[ -z ${CF_USERNAME+"username"} || -z ${CF_PASSWORD+"password"} || -z ${CF_ORG+"org"} || -z ${CF_SPACE+"space"} ]]; then
        return
    else
        cf login \
            -a api.run.pivotal.io \
            -u ${CF_USERNAME} \
            -p ${CF_PASSWORD} \
            -o ${CF_ORG} \
            -s ${CF_SPACE}
    fi
}

function isLoggedIntoPWS() {
    [[ ${DRY} != "false" ]] \
        || $(cf target > /dev/null 2>&1) \
        || $(cf api | grep run.pivotal.io /dev/null 2>&1)
}

function updateChatAppUrlAndHostname() {
    if [[ ${DRY} == "false" ]]; then
        CHAT_APP_URL=$(cf app chat-app | grep routes | sed "s/routes: *//")
        CHAT_APP_HOSTNAME=$(echo ${CHAT_APP_URL} | cut -d '.' -f1)
    fi
}

function updateMessageServiceUrl() {
    if [[ ${DRY} == "false" ]]; then
        MESSAGE_SERVICE_URL=$(cf app message-service | grep routes | sed "s/routes: *//")
    fi
}

function awaitUserOk() {
    if [[ ${CI} == "false" ]]; then
        USER_PROMPTX=${1:-"Press enter"}
        echo -n "${WHITE_ON_BLUE}    ️${USER_PROMPTX}${UNTIL_EOL}${RESET_STYLES}" && read
        clear
    fi
}

function welcome() {
    clear
    echo "${WHITE_ON_BLUE}${UNTIL_EOL}${RESET_STYLES}"
    echo "${WHITE_ON_BLUE}${UNTIL_EOL}    Welcome to ${BOLD}cfpush${RESET_STYLES}${WHITE_ON_BLUE} 💻 ----> ☁️${RESET_STYLES}"
    echo "${WHITE_ON_BLUE}${UNTIL_EOL}${RESET_STYLES}"
    echo "${WHITE_ON_BLUE}${UNTIL_EOL}    An interactive Cloud Foundry tutorial in your terminal${RESET_STYLES}"
    echo "${WHITE_ON_BLUE}${UNTIL_EOL}${RESET_STYLES}"

    prettyEcho ""
    prettyEcho "We will be exploring $(bold "Cloud Foundry") and cloud-native computing by deploying a real chat application to Cloud Foundry."
    prettyEcho ""
    prettyEcho "Are you ready? We can't wait. Let's go!"
    prettyEcho ""

    awaitUserOk "<enter> to ▶️  "
}

function prompt() {
    PROMPT=$1
    COMMAND=$2

    prettyEcho ""
    prettyEcho "${PROMPT}"
    prettyEcho ""
    prettyEcho "Command:"
    prettyEcho ""
    prettyEcho "👉🏽 ${COMMAND}"
    prettyEcho ""

    awaitUserOk "<enter> to 🏃🏾"

    prettyEcho ""
    prettyEcho "⏳ ${COMMAND}"
    prettyEcho ""

    if [[ ${DRY} == "false" ]] ; then
        eval ${COMMAND} \
        | grep -v 'TIP: '
    fi

    prettyEcho ""
    prettyEcho "✔️ ${COMMAND}"
    prettyEcho ""

    awaitUserOk "<enter> to ➡️ "
}

function smokeTestChatApp() {
    curl \
        --fail \
        --silent \
        --location \
        --request GET \
        --url ${CHAT_APP_URL}
}

function smokeTestMessageService() {
    ./scripts/post-message.sh ${CHAT_APP_URL}
    ./scripts/post-message.sh ${CHAT_APP_URL}
    ./scripts/get-messages.sh ${CHAT_APP_URL}
    ./scripts/get-messages.sh ${CHAT_APP_URL}
}

function runSmokeTests() {
    if [[ ${DRY} == "false" && ${CI} != "false" ]]; then
        smokeTestMessageService
        smokeTestChatApp
    fi
}

ensureCfInstalled

welcome

attemptLogIntoPWS

if isLoggedIntoPWS ; then
    : # noop
else
    prompt \
    "To begin, we should login.

When logging in we must identify the specific Cloud Foundry that we want to target. All the commands we run after that will run against that Cloud Foundry.

In our case, we'll log into Pivotal Web Services." \
    "cf login -a api.run.pivotal.io"
fi


prompt \
    "We need somewhere to deploy our apps to.

Let's create a new space for this tutorial." \
    "cf create-space cfpush-tutorial" \

prompt \
    "We have created a new space. But we still have to set it as our current target." \
    "cf target -s cfpush-tutorial"

prompt \
    "We are ready for deployment. Let's start with the frontend, the $(bold "chat-app").

It is a Javascript React application that continuously polls a $(bold "message-service") for messages and allows to send new ones. It expects the $(bold "message-service") on its own host at $(underline "/api").

And like any Javascript browser application, the $(bold "chat-app") is a collection of static files, a \"bundle\". We zipped our bundle into a zipfile located at $(underline "./builds/chat-app.zip"). Since we simply want to serve static files, we will use the \"staticfile_buildpack\" for running the app.

We push the app by pointing the cli at $(underline "./builds/chat-app.zip"), selecting the buildpack and letting Cloud Foundry pick a random available route for us." \
    "cf push
     chat-app
     -p builds/chat-app.zip
     -b staticfile_buildpack
     --random-route"

updateChatAppUrlAndHostname

prompt \
    "Congratulations you have successfully deployed an application to Cloud Foundry!

The $(bold "chat-app") is served at

    $(underline https://${CHAT_APP_URL})

Before we start to use it, let's inspect the app." \
    "cf app chat-app"

prompt \
    "You can see that 1 instance of the app is running. It has the default 1GB of memory and 1GB of disk. That is more than we need for a staticfile app. Let's scale things down. Memory should be 64M and disk 128M.

This is called vertical scaling. Whenever scaling an app vertically Cloud Foundry has to restart it. This involves downtime. For now we're ok with that, so we add '-f'." \
    "cf scale
     chat-app
     -m 64M
     -k 128M
     -f"

prompt \
    "Now let's open the application at

    $(underline https://${CHAT_APP_URL})

You should see that the app \"failed to load any messages\". Oh dear! That's because its backend - the $(bold message-service) - isn't running yet. But the $(bold "chat-app") is a good Cloud-citizen and handles issues with its downstream dependencies gracefully. That's an essential property of any cloud-native application.

Let's avert this misery and deploy the $(bold "message-service"). It's a Java Spring Boot web application that exposes two endpoints:

    GET  $(underline "/api/messages") : returns the list of messages
    POST $(underline "/api/messages") : creates a new message

If it does not have a database attached it will run with an in-memory database.
It is packaged into a JAR file located at $(underline "./builds/message-service").

Again, we push by letting Cloud Foundry pick a random available route for us and pointing at the $(bold "message-service") JAR." \
    "cf push
     message-service
     -p builds/message-service.jar
     --random-route"

updateMessageServiceUrl

prompt \
    "The $(bold "message-service") is deployed and served at

    $(underline https://${MESSAGE_SERVICE_URL})

We have both the $(bold "chat-app") and the $(bold "message-service") deployed now. However, when we visit

    $(underline https://${CHAT_APP_URL})

it still fails to load any messages. See for yourself.

Why is that?

In order to understand we must look at how traffic is currently routed." \
    "cf routes"

prompt \
    "The $(bold "chat-app") is served at $(underline ${CHAT_APP_URL})
The $(bold "message-service") is served at  $(underline ${MESSAGE_SERVICE_URL})

The $(bold "chat-app") expects to reach the $(bold "message-service") at $(underline ${CHAT_APP_URL}/api).
Mind the path $(underline "/api"). That's the problem!

Cloud Foundry's path-based routing to the rescue.

Let's map the route $(underline ${CHAT_APP_URL}/api) to the $(bold "message-service")." \
    "cf map-route
     message-service
     cfapps.io
     --hostname ${CHAT_APP_HOSTNAME}
     --path /api"

prompt \
    "Hooray! The error is gone. The $(bold "chat-app") says there are no messages.

It's time to take out your phone. Go to

    $(underline https://${CHAT_APP_URL})

and chat away!

However, the more users there are the more load will our $(bold "message-service") have. At this moment we only have one instance of it running. We need more!

Adding more instances is called horizontal scaling. This does not require a restart and is almost instantaneous.

Let's scale out to 3. Planet scale!" \
    "cf scale message-service -i 3"

prompt \
"This is weird. As we're using the $(bold chat-app) and sending messages, the message list keeps changing.

Why is that? As we haven't provided the $(bold message-service) with a database, it is running with an in-memory database. That means each instance has its own state. And every time we post or get messages we hit another instance, hence the inconsistency.

This setup is violating the idea of 'stateless processes' according to the twelve-factor app ($(underline "https://12factor.net/processes")).

Since Cloud Foundry might relocate instances in the cloud as it sees fit we might lose messages at any moment.

We need a database. Let's browse the marketplace."\
    "cf marketplace"

prompt \
"We can see there are plenty of services on offer, e.g.

    * Redis
    * Elasticsearch
    * Sendgrid
    * MongoDB
    * app-autoscaler
    * ...

Every service is available with different plans. Some are free, some incur cost. Let's ask Cloud Foundry to give us a database.

$(underline Elephantsql.com) offers Postgres as a service and is available in the marketplace. Let's find out more about its plans." \
"cf marketplace -s elephantsql"

prompt \
"The smallest plan - $(bold turtle) - provides 4 concurrent connections, 20MB Storage and is free. Just what we need!

Let's create an $(bold elephantsql) instance using the $(bold turtle) plan and name it \"$(bold database)\"."  \
"cf create-service
     elephantsql
     turtle
     database"

prettyEcho ""
prettyEcho "waiting for database to be created ..."
prettyEcho ""

if [[ ${DRY} == "false" ]]; then
    while ! cf service database | grep status | grep 'create succeeded'; do
        echo -n . && sleep 1
    done
fi

prompt \
"The Postgres instance is ready.

We still need to connect it to the $(bold "message-service"). In Cloud Foundry terms this called binding.

When we bind a service to an app Cloud Foundry will provide all the necessary information to the app as environment variables. In this case it will provide a JDBC connection string to the $(bold "message-service")." \
"cf bind-service message-service database"

prompt \
"But that's not all. We have to restart the $(bold "message-service").

Since we're using Spring Boot it will will automatically pick up the database.

Caveat: In this case it is enough to just restart the application. In other cases we need to restage it for the changes to take effect (see $(underline "https://docs.cloudfoundry.org/devguide/deploy-apps/start-restart-restage.html"))." \
"cf restart message-service"

prompt \
"As the instances of the $(bold "message-service") have restarted they are all using the database as a backing service. They no longer carry state. We can scale the message-service to our heart's content. The users of the chat will have a consistent experience, whether we have 1 or 100 instances running.

\"May I present to you: the internet!\" ($(underline https://youtu.be/iDbyYGrswtg))

But where's the proof? How can we tell that all incoming traffic is really distributed across all instances of the $(bold message-service)?

Luckily, Cloud Foundry's $(bold loggregator) collects all application logs. It annotates every logged line with the type of process and app instance, e.g. [APP/PROC/WEB/2].

When inspecting the recent logs with a little help from grep we should see instances 0 - 2 logging equally often." \
    "cf logs --recent message-service
    | grep GET
    | grep '\[APP\/PROC\/WEB\/\d\+\]'"

runSmokeTests

prompt \
"Once you're finished playing with the $(bold chat-app), let's clean up. If we don't want incur further cost against our PWS quota, we should decommission all apps and services.

The easiest way to achieve that is to delete the entire space." \
"cf delete-space cfpush-tutorial -f"

prompt \
"That's all for now. Expect updates to this tutorial. Thank you for coming this far!

Your feedback is valued. If there is anything I can do to improve your experience, please, let me know. Give the repository a star, open an issue or send a PR.

$(underline "github.com/mamachanko/cfpush")

There's more: $(underline "https://docs.cloudfoundry.org/#read-the-docs")

Let's log you out. Bye bye!" \
"cf logout"
