module.exports = ({
  region,
  project,
  network,
  procedure,
  memory,
  coreNetwork,
  operationHash,
  timeout,
  envUriSpecifier,
  serviceName,
  rolesBucket,
  secretBucket,
  secretBucketKeyLocation,
  secretBucketKeyRing,
  computeUrlId,
  nodeEnv,
  env = "",
  labels = "",
  allowUnauthenticated = false,
} = {}) => {
  return {
    name: "gcr.io/cloud-builders/gcloud",
    args: [
      "beta",
      "functions",
      "deploy",
      `${serviceName}`,
      "--trigger-http",
      `--entry-point=main`,
      `--memory=${memory}`,
      ...(allowUnauthenticated ? ["--allow-unauthenticated"] : []),
      `--project=${project}`,
      `--runtime=nodejs10`,
      `--region=${region}`,
      `--timeout=${timeout}`,
      `--set-env-vars=${Object.entries({
        NODE_ENV: nodeEnv,
        NETWORK: `${envUriSpecifier}${network}`,
        CORE_NETWORK: `${envUriSpecifier}${coreNetwork}`,
        PROCEDURE: procedure,
        OPERATION_HASH: operationHash,
        GCP_PROJECT: project,
        GCP_REGION: region,
        GCP_SECRET_BUCKET: secretBucket,
        GCP_ROLES_BUCKET: rolesBucket,
        GCP_KMS_SECRET_BUCKET_KEY_LOCATION: secretBucketKeyLocation,
        GCP_KMS_SECRET_BUCKET_KEY_RING: secretBucketKeyRing,
        GCP_COMPUTE_URL_ID: computeUrlId,
        ...env,
      }).reduce((string, [key, value]) => (string += `${key}=${value},`), "")}`,
      `--update-labels=${Object.entries({
        procedure,
        hash: operationHash,
        ...labels,
      }).reduce((string, [key, value]) => (string += `${key}=${value},`), "")}`,
    ],
  };
};
