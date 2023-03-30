const { RxHR } = require('@akanass/rx-http-request');
const { map, mergeMap } = require('rxjs')
require('dotenv').config();

const token = process.env.BITBUCKET_ACCESS_TOKEN;
const workspace = process.env.REPOSITY_WORKSPACE;
const repository = process.env.REPOSITY_NAME;
const branchName = `${process.env.DEPENDENCY_NAME}-${process.env.DEPENDENCY_VERSION}`;

const baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}`;

const defaults = {
  headers: { Authorization: `Bearer ${token}` },
  json: true,
};

function createBranch(name) {
  // TODO: handle already created branch
  return RxHR.post(`${baseUrl}/refs/branches`, {
    ...defaults,
    body: {
      name : name,
      target : { hash : 'master' },
    },
  }).pipe(
    map(({ body }) => body),
  );
}

function getPackageJsonContent() {
  // TODO: handle different package.json location
  // TODO: handle pagination
  return RxHR.get(`${baseUrl}/src`, defaults).pipe(
    // TODO: handle errors
    map(({ body }) => body),
    map(({ values }) => values.find(file => file.path === 'package.json')),
    mergeMap(file => RxHR.get(file.links.self.href, defaults)),
    map(({ body }) => body),
  );
}

getPackageJsonContent().subscribe((console.log))

// TODO: create a commit
// TODO: create a PR