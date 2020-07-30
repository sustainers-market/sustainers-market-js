const { CloudTasksClient } = require("@google-cloud/tasks");
const client = new CloudTasksClient();

exports.create = async ({ project, location, name }) => {
  const parent = client.locationPath(project, location);

  const [response] = await client.createQueue({
    parent,
    queue: {
      name: client.queuePath(project, location, name),
    },
  });
  return response;
};

exports.enqueue = ({
  serviceAccountEmail,
  project = process.env.GCP_PROJECT,
  location = process.env.GCP_REGION,
  computeUrlId = process.env.GCP_COMPUTE_URL_ID,
  queue,
  wait = 0,
}) => async ({ url, data = {}, token, hash, name, method = "post" }) => {
  const parent = client.queuePath(project, location, queue);

  const string = JSON.stringify(data);

  const body = Buffer.from(string).toString("base64");

  //TODO
  console.log({
    ...(!token && {
      oidcToken: {
        serviceAccountEmail:
          serviceAccountEmail || `executer@${project}.iam.gserviceaccount.com`,
        ...(hash &&
          name && {
            audience: `https://${location}-${name}-${hash}-${computeUrlId}-uc.a.run.app`,
          }),
      },
    }),
    httpRequest: {
      httpMethod: method.toUpperCase(),
      url,
      ...(!token && {
        oidcToken: {
          serviceAccountEmail:
            serviceAccountEmail ||
            `executer@${project}.iam.gserviceaccount.com`,
          ...(hash &&
            name && {
              audience: `https://${location}-${name}-${hash}-${computeUrlId}-uc.a.run.app`,
            }),
        },
      }),
      headers: {
        "content-type": "application/json",
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body,
    },
  });

  const task = {
    httpRequest: {
      httpMethod: method.toUpperCase(),
      url,
      ...(!token && {
        oidcToken: {
          serviceAccountEmail:
            serviceAccountEmail ||
            `executer@${project}.iam.gserviceaccount.com`,
          ...(hash &&
            name && {
              audience: `https://${location}-${name}-${hash}-${computeUrlId}-uc.a.run.app`,
            }),
        },
      }),
      headers: {
        "content-type": "application/json",
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body,
    },
    scheduleTime: {
      seconds: wait + Date.now() / 1000,
    },
  };

  //TODO
  console.log({ task });
  const request = {
    parent,
    task,
  };

  const [response] = await client.createTask(request);

  return response;
};
