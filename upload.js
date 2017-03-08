#!/usr/bin/env node

// This uploader uploads a TEXT file to github

const request = require('request');
const process = require('process');
const fs = require('fs');

// Request info
const apikey = process.env.GITHUBAPIKEY;
const username = process.env.GITHUBUSER;
const repo = process.env.REPO;
const user_agent = 'Github Commit Tool!';

if (process.argv.length == 4) { // Require a filename
  const filename_to_upload = process.argv[2];
  const filename_on_git = process.argv[3];
} else {
  console.log('Requires the filename and pathname on git as a parameter');
  process.exit(1);
}

// Configurables
const filename_on_git_mode = '100644';
const commit_message = 'Why I love github';
const branch_ref_to_commit = "refs/heads/master";

const step1_url = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/refs/heads/master";

// Request object - GET
var requestObjParams = {
  method: 'GET',
  uri: step1_url,
  headers: {
    'User-Agent': user_agent
  }
};

// Step 1
request(requestObjParams, function(s1error, s1response, s1body) {
  if (s1response.statusCode == 200) {
    var step1_body = JSON.parse(s1body);
    if (step1_body['object'] !== undefined) {
      if (step1_body['object']['type'] !== undefined) {
        if (step1_body['object']['type'] == "commit") {
          var sha_last_commit = step1_body['object']['sha']; // Get SHA of last commit
          const step2_url = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/commits/" + sha_last_commit;
          // Step 2
          requestObjParams['uri'] = step2_url;
          request(requestObjParams, function(s2error, s2response, s2body) {
            if (s2response.statusCode == 200) {
              var step2_body = JSON.parse(s2body);
              var sha_base_tree = step2_body['tree']['sha']; // Get SHA of BASE TREE (Step 2)
              // On to step 3
              fs.readFile(filename_to_upload, function(err, fd) {
                if (!err) {
                  base64data = new Buffer(fd).toString('base64');
                  // Step 2.5 Create blob
                  const step25_url = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/blobs";
                  requestObjParams['uri'] = step25_url;
                  requestObjParams['method'] = 'POST';
                  requestObjParams['body'] = JSON.stringify({
                    "content": base64data,
                    "encoding": "base64"
                  });
                  requestObjParams['headers']['content-type'] = 'application/json';
                  request(requestObjParams, function(s25error, s25response, s25body) {
                    if (!s25error) {
                      var step25_body = JSON.parse(s25body);
                      if (step25_body['sha'] !== undefined) {
                        var sha_blob = step25_body['sha']; // Get SHA from BLOB
                        // Step 3.5
                        const step35_url = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/trees"
                        requestObjParams['uri'] = step35_url;
                        requestObjParams['body'] = JSON.stringify({
                          "base_tree": sha_base_tree,
                          "tree": [
                            {
                              "path": filename_on_git,
                              "mode": filename_on_git_mode,
                              "type": "blob",
                              "sha": sha_blob
                            }
                          ]
                        });
                        request(requestObjParams, function(s35error, s35response, s35body) {
                          if (!s35error) {
                            var step35_body = JSON.parse(s35body);
                            if (step35_body['sha'] !== undefined) {
                              var tree_sha = step35_body['sha'];
                              // Step 4: Make commit
                              requestObjParams['uri'] = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/commits"
                              requestObjParams['body'] = JSON.stringify({
                                "parents": [
                                  sha_last_commit
                                ],
                                "tree": tree_sha,
                                "message": commit_message,
                                "author": {
                                  "name": "nolim1t",
                                  "email": "hello@nolim1t.co",
                                  "date": "2017-03-09T07:28:45+08:00"
                                }
                              });
                              request(requestObjParams, function(s4error, s4response, s4body) {
                                if (!s4error) {
                                  var step4_body = JSON.parse(s4body);
                                  if (step4_body['sha'] !== undefined) {
                                    var commit_sha = step4_body['sha'];
                                    requestObjParams['uri'] = "https://" + username + ":" + apikey + "@api.github.com/repos/" + username + "/" + repo + "/git/refs/heads/master"
                                    requestObjParams['body'] = JSON.stringify({
                                      "ref": branch_ref_to_commit,
                                      "sha": commit_sha
                                    });
                                    request(requestObjParams, function(s5error, s5response, s5body) {
                                      if (!s5error) {
                                        var step5_body = JSON.parse(s5body);
                                        console.log(step5_body);
                                      } else {
                                        console.log("Couldnt commit to a branch");
                                      }
                                    });
                                  } else {
                                    console.log('Cant get SHA for commit');
                                  }
                                } else {
                                  console.log("Commit Error");
                                }
                              });
                            } else {
                              console.log('Can\'t get SHA of tree');
                            }
                          } else {
                            console.log("Error creating tree for blob");
                          }
                        });
                      } else {
                        console.log('SHA is missing from creating a blog');
                      }
                    } else {
                      console.log("Error creating BLOB");
                    }
                  });
                } else {
                  console.log("Error reading file!");
                }
              });
            } else {
              console.log('An error has occured - step 2')
            }
          });
        }
      }
    }
  } else {
    console.log("An Error has occured - step 1");
  }
});
