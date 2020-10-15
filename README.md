# Blossm

1. [Overview](#overview)
1. [Blossm Core network](#blossm-core-network)
2. [Setup](#setup)
3. [Deploy](#deploy)
4. [TODO](#todo)

---

## Overview

### Blossm is a javascript Event Sourcing CQRS orchestrator, and includes a description for setting up multi-project interoperability through a Blossm Core network.

CQRS is an Event Sourcing software architecture pattern where the write and read responsibilites are organized around seperate data stores. 
The write side takes a request, performs a routine, and optionally logs some events with metadata to a store, thus modifying the state of the app forever — the event stores meant to be immutable.
The read side listens for logged events and uses their metadata to write to any number of denormalized view stores to be queried. All view stores can be destroyed and recreated at any time based on the event log. 

Blossm currently has adapters to run on GCP using a MongoDB database for its stores, but adapters can be built to deploy procedures on any compute server using a database of your choice.

Blossm does this with 8 types of procedures, all of which can be run as lambda functions on GCP Cloud Run, configured entirely with `blossm.yaml` files, and deployed with a CLI tool:

On the write side:

* `event-store` - Deployed to log events with a shared schema. Events that share a `root` refer to the same entity, and can be aggregated to determine the state of that entity at any point in time. `event-stores` connect to a Collection in a MongoDB Atlas instance. 

* `command` - Deployed to do a single-purpose job on-demand which has the oportunity to log events throughout it's execution. Commands can call other commands.

* `fact` - Deployed to deliver some specic information about the state of the app.

* `command-gateway` - Deployed to permit external access to a set of `commands` under specified conditions.

* `fact-gateway` - Deployed to permit external access to a set of `facts` under specified conditions.


On the read side:

* `view-store` - Deployed to store denormalized data that is intended to be queried. `view-stores` connects to a Collection in a MongoDB Atlas.

* `projection` - Deployed to listen for Events and map their data to a `view-store`. If the projection is changed, it can be replayed on-demand using a CLI, which will update the `view-stores` with the most recent mapping.

* `view-gateway` - Deployed to permit external access to a set of `view-stores` under specified conditions.

### How ideas are organized within Blossm

Once the purpose of each of the above procedures makes some sense to you, the big question becomes how to use them to solve your applications needs.

Blossm works off of the event sourcing pattern, meaning the state of the app is determined entirely by the chronological aggregation of immutable events that are logged. Events that affect the same *thing* can overwrite previous states of that thing. In Blossm, the `root` of an event (a UUID) refers to the *thing* that it affects, and when you add all events that have happened to a specic `root` over each other, the result is called the *aggregate root*, which represents the current state of that thing.  

For example, if 3 events have been logged into an `event-store`: 

```javascript
{
  headers: {
    root: "a1s2d3f4",
    action: "paint"
    created: "<last week>",
    number: 1
  }
  payload: {
    frameColor: "pink",
    handlebarColor: "yellow"
  }
}
{
  headers: {
    root: "a1s2d3f4",
    action: "paint"
    created: "<yesterday>",
    number: 2
  }
  payload: {
    frameColor: "orange",
  }
}
{
  headers: {
    root: "a1s2d3f4",
    action: "add-basket"
    created: "<today>",
    number: 3
  }
  payload: {
    basketLocation: "front",
  }
}
```

The aggregate root, which is the current state of the thing described by `a1s2d3f4` would be:

```javascript
{
  headers: {
    root: "a1s2d3f4",
    lastEventNumber: 3
  }
  payload: {
    bodyColor: "orange",
    handlebarColor: "yellow"
    basketLocation: "front",
  }
}
```

With this bit of concrete information in mind, here's an effective way to organize your procedures to get the most out of events:

#### Write-side organization

* `domain` - You can think of a `domain` as a labeled category of like *things*, where similar operations can be done to an instance of a particular thing. In the example above, you can imagine each event belonging to a "bicycle" `domain`. Each `domain` has one `event-store` that stores similar events of various `roots`, and can have one `command-gateway` to allow external access to it's `commands`. 

* `service` - You can think of a `service` as a labeled category of `domains` that tend to be interdependant. In the example above, you can imagine the "bicycle" `domain` belonging to a "shop" `service`, which may also contain "helmet" and  "lights" as other `domains`. Each `service` is made up of any number of interdependant `domains`, meaning any `commands` from within a `service` can freely log events to any of it's `event-stores`. `services` can also depend on functionality from other `services` unidirectionally.

* `network` - You can think of the `network` as the top level container of your application. In the example above, you can imagine the "shop" `service` belonging to the "bicyclecity.com" `network`, which may also contain an "staff" service that manages functionality and events relating to hiring and scheduling. Each network is made up of any number of `services` who's `commands` can call each other directly without a gateway. The network can have up to 4 environments: `development`, `staging`, `sandbox`, and `production`.

Here's a visual metaphor:

![alt text](/imgs/write-layers.png "Write organizational layers")

`command-gateways` are addressed by `c.<domain>.<service>.<network>`, so in the example diagram above the commands would be accessible at:

* `c.video.content.youtube.com/upload`
* `c.video.content.youtube.com/change-visibility`
* `c.video.content.youtube.com/finish-viewing`
* etc.

`fact-gateways` are addressed by `f.<domain>.<service>.<network>`

Non-`production` gateways are addressed with a network prefix of `.dev | .stg | .snd`.


#### Read-side organization

Read-side functionality is organized around permissions. Blossm read-side procedures can be organized and easily configured to pull off very specific intents, such as "I only want a certain account to have access to these views", or "I only want certain group of accounts to have access to these views", or "I want everyone who is authenticated to have access to these views", or the most broad "I want everyone on the internet to have access to these views".

* `context` - Blossm manages permissions most broadly through `contexts`. Without going into the specifics of how permissions work, note that requests are made to `view-gateways` with a cookie containing a JWT token with information about the `contexts` that are accessible by this token. `view-stores` can be placed in a `context` if it can only be accessed by tokens that have that `context` specified.

For example, let's say you're building a task manager application for a team. Let's say there is a "team" `domain`, and that the `root` of your team is "q1w2e3r4t5y6". Since your account is associated with this team, your session token will have a `context` in it like so:

```javascript
{
  context: {
    team: {
      root: "q1w2e3r4t5y6",
      service: "your-team-service",
      network: "your-team.network"
    },
    //... there'll be other things in the context.
  }
}
```

Each time you make a request, the Blossm procedures know that you have access to this specific team, and can prevent access at the gateway level if the requesting token seems to be lacking permissions. 

If calling a `view-store` within the "team" context, you'll only be able to access data that was created from the team with `root` "q1w2e3r4t5y6".

The basic use cases of Blossm don't require the knowledge to weild `contexts` in custom ways. 

![alt text](/imgs/read-layers.png "Read organizational layers")

In the example diagram above, the `home-feed` and `search-feed` stores are accessible by any token, and the `history` and `profile` stores are only accessible to a token containing an `account` context.

`view-gateways` are addressed by `v(.<context>)?.<network>`, so in the above examples the views would be accessible at:

* `v.youtube.com/home-feed`
* `v.youtube.com/search-feed`
* `v.account.youtube.com/history`
* `v.account.youtube.com/profile`

Again, non-`production` gateways are addressed with a network prefix of `.dev | .stg | .snd`.

---

## Blossm Core network

Blossm applications must be built around an implementation of the Blossm Core network, which manages all of the basic stuff that applications need such as accounts, sessions, token issuance, permissions, roles, authentication, and publishing updated views to connected clients. Any application built around the same Blossm Core network can easily interoperate with one another.

There are a few non-required traits of a Blossm Core network that are strongly encouraged:

* A Blossm Core network is encouraged to not collect any personal information to associate with accounts. It is encouraged that accounts be created, verified, and managed through email addresses or Ethereum addresses (or ENS) only.

* A Blossm Core network is encouraged to keep regular snapshots of it's data on an open file system, like FileCoin, for public auditability.

* A Blossm Core network is encouraged to associate wallets to accounts that can be used by any application built around it for sending / receiving payments on Ethereum. Fiat is encouraged, but often requires KYC which is at odds the first bullet. Find a balance and push for progress when it comes to open value transfer.

There aren't yet clear guidelines on how to implement your own Blossm Core network according to a specified interface, but there is one implementation currently in Beta done by `sustainers.network`. The implementation can be found here: <https://github.com/sustainers-network/blossm>. I've spent my time implementing, not documenting.


Blossm Core networks are set up just like any other Blossm network though.

---

## Setup 

Here's how to set up your Blossm workflow.

If you already use Node, the only thing you'll have to install is the Blossm CLI tool which makes it easy to spin up procedures, run tests, deploy to any environment, replay events over projections, and manage various other details of your application:

```javascript
npm install -g @blossm/cli
```

Then initialize a Blossm project:

```javascript
blossm init
```

The provided `config.yaml` is where you'll specify the configurations of your app, the `services` folder is where you'll write your write-side procedures, and the `contexts` folder is where you'll write your read-side procedures. There are some examples in there for you.

Once you're ready to write procedures and have made sense of how the files are organized, here's how to init each of them:

```javascript
// write side:
blossm event-store init
blossm command init
blossm fact init
blossm command-gateway init
blossm fact-gateway init

// read side:
blossm view-store init
blossm projection init
blossm view-gateway init
```

Each procedure is a small directory made up of a `blossm.yaml` file where it's configured, and a few other files where the necessary peices of functionality can be coded. Here's some info about the file contents of each type of procedure:

On the write side:

* `event-store`
  * `blossm.yaml` - Specify what the `domain` and `service` of this event store are, list the event actions that can be handled, define the schema of a valid event that should be accepted and stored, and write some example events for the unit tests and integration tests to check against that must pass before deployment is possible.
  * `handlers.js` - Write instructions for how to transform the state of an aggregate for each event actions. 

* `command`
  * `blossm.yaml` - Specify what the `domain` and `service` of this command are, define the schema of a valid payload that should be accepted, and write some example payloads for the unit tests and integration tests to check against that must pass before deployment is possible.
  * `main.js` - Write a function that runs when the command is called that does a specific routine. Blossm provides tools to make it easy to call other commands, read from the state of the app, conditionally log new `events`, and return some data to the command issuer from within this function.
  * `normalize.js` - Specify how a valid payload should be cleaned/formatted before its given to `main.js`.
  * `deps.js` - Export external dependencies that can be used in `main.js` and easily mocked out in tests.

* `fact`
  * `blossm.yaml` - Specify what the `domain` and `service` of this fact are, define the schema of a valid payload that should be accepted, and write some example queries for the unit tests and integration tests to check against that must pass before deployment is possible.
  * `main.js` - Write a function that runs when the fact is called that reads from the state of the app or from anywhere else on the internet to produces some formatted data to return the requester.

* `command-gateway`
  * `blossm.yaml` - Specify what the `domain` and `service` of this command-gateway are, list the commands that it exposes, and define the conditions that must be met for a requester to issue each command. 

* `fact-gateway`
  * `blossm.yaml` - Specify what the `domain` and `service` of this fact-gateway are, list the commands that it exposes, and define the conditions that must be met for a requester to get each fact. 

On the read side:

* `view-store`
  * `blossm.yaml` - Specify what the `context` of this view store is, define the schema of a valid view that should be accepted and stored, list the indexes that the store can be queried and sorted by, and write some example queries for the unit tests and integration tests to check against that must pass before deployment is possible.
  * `format.js` - Optionally write a function that each view is passed through on its way to the requester, letting you store raw data that's easy to query and manipulate, while returning a richer determanistically transformed version of that data.

* `projection`
  * `blossm.yaml` - Specify which `view-store` event data gets mapped to, list the event actions that are listened for, and write some example events for the unit tests and integration tests to check against that must pass before deployment is possible.
  * `handlers.js` - Write instructions for how to map aggregate state into views for each state change is listened for. 

* `view-gateway`
  * `blossm.yaml` - Specify what the `context` of this view-gateway fateway, list the view stores that it exposes, and define the conditions that must be met for a requester to query each store. 


Once you're ready to run unit tests locally:

```javascript
blossm test
```

Once you're ready to run unit tests and integration tests remotely:

```javascript
blossm deploy --dry-run 
```

And finally once you're ready to deploy after running unit and integration tests remotely:

```javascript
blossm deploy 
```

You can always replay a projection with:

```javascript
blossm replay 
```


## Deploy 

1. [GCP](#gcp)
2. [Others](#others)

### GCP 

Below are instructions for how to orchestrate your Blossm procedures on Google's Cloud Run serverless infrastructure. Each GCP Organization corresponds to a `network`, and each GCP project within that network corresponds to an environment. The `production` environment is required, but feel free to skip setting up `development`, `staging`, and `sandbox`, if you don't yet need them.

Within each GCP project, you'll be using:

* __Cloud Run__ to serve your Blossm procedures as serverless functions.
* __Cloud Pub/Sub__ to publish messages when `events` are logged, which in turn trigger the execution of relevant `projections`.
* __Cloud Tasks__ to schedule procedure execution on a queue to manage load.
* __Cloud DNS__ to manage your network's top-level domain and any subdomains in your network.
* __Cloud Storage__ to store any static Roles your Blossm application may want to reference, and any encrypted secrets you may want to save ahead of time to give your app runtime access to.
* __Cloud KMS__ to manage cryptographic keys for JWT token signing and to encrypt any secrets you may want to reference during the runtime of your app.
* __Cloud IAM__ to manage permissions and create Service Accounts.
* __Cloud Scheduler__ to schedule commands to be executed later.
* __Cloud Memorystore__ for using a shared cache between procedures for optimization.

#### Initial setup

1. Download and install gcloud at https://cloud.google.com/sdk/docs/quickstarts.

#### Networking

1. Verify that you own the domain on [this site](https://search.google.com/u/1/search-console/users?resource_id=sc-domain:sm.network).
    * Click Add property on the top right.
      * Go through the steps until the property is verified.

2. In the `production` project:
    * In **Network Services > Cloud DNS**, enable Cloud DNS.
      * Create a public DNS Zone named **“network”**. With DNS name \[your-domain\].
        * Turn on DNSSEC.
      * Set the Name servers of your domain in its domain registry to the data of the NS record set.
      * If you set TXT and MX records in your domain registry as part of step 3 of Initial Setup, move those records to GCP also.
  
3. In the `development` project:
    * In **Network Services > Cloud DNS**, enable Cloud DNS.
      * Create a public DNS Zone named **“network”**. With DNS name dev.\[your-domain\].
        * Turn on DNSSEC.
      * Note the NS Data domains. There should be four.

4. Back in the `production` project:
    * Add a record set named dev.\[your-domain\] of type NS. 
    * Add the NS data domains from step 2 as name servers.

5. Repeat steps 2 & 3 with the `sandbox` and `staging` projects using snd.[your domain] and stg.[your domain].

6. Visit [this](https://www.google.com/webmasters/verification/home?hl=en) site and add your domain as a property. You’ll be given a TXT record to use. Keep this site open.

7. Back in the `production` project:
    * Add a record set for your domain of type TXT. For the value, use the one show on the page from step 7. 

8. Click Verify on this site from step 7. Sometimes it takes a little while for the TXT record to propagate, so keep trying to verify if you don’t succeed at first.


#### VPC

1. In the `development` project:
    * In **VPC network > Serverless VPC** access, enable Serverless VPC access API.
    * Create a connector named **“us-central1”** in the us-central1 region under the default network with ip range 10.8.0.0/28.

2. Repeat step 1 with the `production`, `sandbox` and `staging` projects. 


#### Permissions


### Others

Only a GCP adapter is currently implemented. If other's are needed, I'd be happy to support their development.

---

## TODOs

#### Organizational

- [x] Start documentation for Blossm. 
- [ ] Add a hello world application that is included with `blossm init`. 
- [ ] Create richer docs with more specifics about the inputs and expected outputs of certin procedure functions. 

#### Code 

- [ ] Pull out GCP functionality from the `cli` directory into an `adapters` directory to make it easy to implement Blossm on other prociders.
- [ ] Pull out `//cli/src/projection/deploy/src/index` into `//procedures/projection` and write tests for it.
- [ ] Resolve leftover `TODO`s in the codebase.


#### Design

- [ ] Implement a brand for Blossm.

... documentation to be continued ...
      <!-- root, // The root to aggregate
      { // optional
        domain, // The root's domain. Defaults to the current domain.
        service, // The root's service. Defaults to the current service.
        network, // The root's network. Defaults to the current network.
        notFoundThrows // If true, an error will be thrown if the root isn't found. If false, null is returned. Defaults to true. 
      } = {}
    }) => {
      // The state of the aggregate.
      state: {
        some: state
      },
      // The number of the last event of this aggregate.
      lastEventNumber: aggregate.headers.lastEventNumber,
      // The root that was aggregated.
      root: aggregate.headers.root,
    } -->