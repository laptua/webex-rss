# webex-rss

Webex RSS is a parser bot designed to enrich the data provided from the Webex RSS Feeds.

It provides the following functions
- Separates the feed content into three Webex Spaces (Incidents, Maintenance and Announcements)
- Define a filter to limit based on a specific/set of clusters to monitor.
- Raise individual Tasks in JIRA for IT Service Management support processing. 
- Further updates to each JIRA Task will be added as a comment

## Deployment

1. Register a Bot at [Webex Developers](https://developer.webex.com/my-apps) for your Organization
2. Prepare JIRA Requirements, (if using JIRA)

    a. Prepare Credentials
    ```
    > echo -n 'email:api_token' | base64
    ```
    b. Add new or select existing field in JIRA for RSS Feed item unique identifier (used to match existing JIRA Tickets)

3. Create Spaces for Output Messages in Webex App
4. Obtain RoomId for each room (simply add astronaut@webex.bot to space)
3. Build and Deploy Docker Container (or deploy to Cloud)

    ```
    > docker build --tag webex-rss .
    > docker create --name webex-rss \
      -e _ENVIRONMENTAL_VARIABLE_ = _value_ \
      webex-rss
    ```
    **Note** - JIRA is Optional

### Environmental Variables

These variables can be individually defined in Docker, or loaded as an `.env` file in the `/app` directory.

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| TOKEN | **Required** | ` ` | Bot Token for Webex Messaging Posts
| INC_ROOM | **Required** | ` ` | RoomId for Webex Incident Space
| MAINT_ROOM | **Required** | ` ` | RoomId for Webex Maintenance Space
| ANNOUNCE_ROOM | **Required** | ` ` | RoomId for Webex Announcement Space
| API_ROOM | Optional | ` ` | RoomId for Webex Developer API Space
| CLUSTER_FILTER | Optional | ` ` | Comma Separated List of Cluster Names to include.
| GLOBAL_AGENT_HTTP_PROXY | Optional | ` ` | HTTP Proxy Setting
| GLOBAL_AGENT_NO_PROXY | Optional | ` ` | Comma Separated List of excluded domains (Supports wildcards)
| JIRA_SITE | Optional | ` ` | FQDN of JIRA Instance
| JIRA_PROTOCOL | Optional | `https` | Protocol used to access JIRA Interface
| JIRA_SSL | Optional | `true` | Enables Strict SSL of the JIRA Server  
| JIRA_USERNAME | Optional | ` ` | JIRA Username for Authentication
| JIRA_PASSWORD | Optional | ` ` | JIRA Password or API Token for Authentication
| JIRA_PROJECT | Optional | ` ` | JIRA Project Code (eg. NOTIFY)
| JIRA_ISSUE | Optional | ` ` | JIRA Issue Type (eg. Task)
| JIRA_EPIC_FIELD | Optional | ` ` | JIRA Parent EPIC Link Field Name (eg. customfield_12100)
| JIRA_EPIC_ID | Optional | ` ` | JIRA Parent EPIC Link Identifier (eg. EPIC-1223)
| JIRA_IDENTIFIER_FIELD | Optional | ` ` | JIRA Field API Identifier to store RSS Item Unique ID
| JIRA_IDENTIFIER_NAME | Optional | ` ` | JIRA Field Name to store RSS Item Unique ID
| JIRA_API_LOG | Optional | `false` | Log JIRA Tickets for Developer API Entries
| DEBUG | Optional | ` ` | Output Debug Log Entries to console (set to `webex-rss*`)
| NODE_ENV | Optional | `production` | RSS Cache data is skipped if NODE_ENV is set to Production (used for testing)
| NODE_EXTRA_CA_CERTS | Optional | ` ` | absolute path to additional CA file in pem format (eg. /certs/cacert.pem)

4. Verify Docker logs to ensure bot as started successfully, optionally debug can be enabled for more detail.

## Support

In case you've found a bug, please [open an issue on GitHub](../../issues).

## Disclaimer

This script is NOT guaranteed to be bug free and production quality.
