/**
 * apps-script-webhook.js
 * ----------------------
 * Paste this into the Google Sheet's Apps Script editor:
 *   Extensions → Apps Script → replace contents → Save
 *
 * Set up the trigger:
 *   Triggers (alarm clock icon) → Add Trigger
 *   Function: onFormSubmit
 *   Event source: From spreadsheet
 *   Event type: On form submit
 *
 * Store your GitHub PAT as a Script Property (not hardcoded):
 *   Project Settings → Script Properties → Add property
 *   Key: GITHUB_PAT
 *   Value: your fine-grained PAT (needs Actions: write + Contents: write on this repo)
 */

var REPO_OWNER = 'roff-dev'
var REPO_NAME  = 'money-machine'

function onFormSubmit(e) {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT')
  if (!pat) {
    Logger.log('ERROR: GITHUB_PAT script property is not set.')
    return
  }

  var payload = JSON.stringify({
    event_type: 'new-form-submission',
    client_payload: {
      timestamp: new Date().toISOString(),
    },
  })

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: {
      Authorization: 'token ' + pat,
      Accept: 'application/vnd.github.v3+json',
    },
    muteHttpExceptions: true,
  }

  var url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/dispatches'
  var response = UrlFetchApp.fetch(url, options)
  var status   = response.getResponseCode()

  if (status === 204) {
    Logger.log('GitHub dispatch sent successfully.')
  } else {
    Logger.log('GitHub dispatch failed. Status: ' + status + ' — ' + response.getContentText())
  }
}
