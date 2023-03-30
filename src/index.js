const { RxHR } = require('@akanass/rx-http-request');
const { map, mergeMap } = require('rxjs')
require('dotenv').config();

const token = process.env.BITBUCKET_ACCESS_TOKEN;
const workspace = process.env.REPOSITY_WORKSPACE;
const repository = process.env.REPOSITY_NAME;
const branchName = `${process.env.DEPENDENCY_NAME}-${process.env.DEPENDENCY_VERSION}`;

const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}`;

const httpClient = RxHR.defaults({
  headers: { Authorization: `Bearer ${token}` },
  json: true,
});

// TODO: add destination branch
// TODO: add progress logging

function createBranch(name) {
  // TODO: handle already created branch
  return httpClient.post(`${baseUrl}/refs/branches`, {
    body: { name : name, target : { hash : 'master' } },
  }).pipe(map(({ body }) => body));
}

function getPackageJsonContent() {
  // TODO: handle different package.json location
  // TODO: handle pagination
  return httpClient.get(`${baseUrl}/src`).pipe(
    // TODO: handle errors
    map(({ body }) => body),
    map(({ values }) => values.find(file => file.path === 'package.json')),
    // TODO: get file content as string
    mergeMap(file => httpClient.get(file.links.self.href)),
    map(({ body }) => body),
  );
}

function updateDependenciesVersions(packageJson, dependencyName, dependencyVersion) {
  // TODO: handle dev/prod dependency location
  return {
    ...packageJson,
    dependencies: {
      ...(packageJson.dependencies || {}),
      [dependencyName]: dependencyVersion,
    },
  }
}

function commitPackageJson(packageJson, branch) {
  return httpClient.post(`${baseUrl}/src`, {
    form: {
      // TODO: work with it as with text, it will prevent formatting issues
      'package.json': JSON.stringify(packageJson, null, 2),
      branch,
      message: `Update ${branch}`
    }
  });
}

function createPullRequest(destinationBranch, sourceBranch) {
  return httpClient.post(`${baseUrl}/pullrequests`, {
    body: {
      title: `${sourceBranch} -> ${destinationBranch}`,
      source: { branch: { name: sourceBranch } },
      destination: { branch: { name: destinationBranch } },
    }
  });
}

getPackageJsonContent().pipe(
  map(packageJson => updateDependenciesVersions(packageJson, process.env.DEPENDENCY_NAME, process.env.DEPENDENCY_VERSION)),
  // TODO: do not create a branch if dependency is already updated
  mergeMap(packageJson => createBranch(branchName).pipe(
    mergeMap(() => commitPackageJson(packageJson, branchName)),
    mergeMap(() => createPullRequest('master', branchName)),
  )),
).subscribe(() => console.log('Done'));
