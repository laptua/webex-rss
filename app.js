const debug = require('debug')('webex-rss:app');
const Watcher = require('feed-watcher');
const dotenv = require('dotenv');
const Webex = require('webex');

// Load ENV if not present
if (!process.env.WEBEX_CLIENT_ID) {
  debug('Load from .env');
  dotenv.config();
}

// Parse Cluster Filter ENV
let clusterFilter = [];
if (process.env.CLUSTER_FILTER) {
  try {
    clusterFilter = process.env.CLUSTER_FILTER.split(',');
  } catch (error) {
    debug('unable to parse cluster filter');
    process.exit(2);
  }
  debug(`Loaded Cluster filter: ${clusterFilter}`);
}

// Load Webex SDK
let webex;
try {
  webex = Webex.init({
    credentials: {
      access_token: process.env.TOKEN,
    },
  });
} catch (error) {
  debug('Unable to load Webex, aborting...');
  process.exit(2);
}

// Define RSS Feeds
const incidentFeed = 'https://status.webex.com/history.rss';
const announcementFeed = 'https://status.webex.com/maintenance.rss';

// Load RSS Watcher Instances
const interval = process.env.RSS_INTERVAL || 60;
const incidentWatcher = new Watcher(incidentFeed, interval);
const announcementWatcher = new Watcher(announcementFeed, interval);

async function parseCluster(content) {
  const clusters = [];
  // Webex Teams
  // if (content.includes('Webex Teams')) {
  //   clusters.push('Webex Teams');
  // }
  // Webex Meetings Clusters
  if (content.includes('San Jose')) {
    clusters.push('AC');
    clusters.push('AW');
    clusters.push('B');
    clusters.push('E');
    clusters.push('F');
    clusters.push('IB');
    clusters.push('IE');
    clusters.push('IJ');
    clusters.push('S');
    clusters.push('U');
  }
  if (content.includes('London')) {
    clusters.push('AI');
    clusters.push('BI');
    clusters.push('I');
    clusters.push('W');
  }
  if (content.includes('Virginia')) {
    clusters.push('AA');
    clusters.push('AB');
  }
  if (content.includes('Singapore')) {
    clusters.push('AS');
  }
  if (content.includes('FedRAMP')) {
    clusters.push('F');
  }
  if (content.includes('Sydney')) {
    clusters.push('AP');
  }
  if (content.includes('AA')) {
    clusters.push('AA');
  }
  if (content.includes('AB')) {
    clusters.push('AB');
  }
  if (content.includes('AC')) {
    clusters.push('AC');
  }
  if (content.includes('AO')) {
    clusters.push('AO');
  }
  if (content.includes('AP')) {
    clusters.push('AP');
  }
  if (content.includes('AS')) {
    clusters.push('AS');
  }
  if (content.includes('AW')) {
    clusters.push('AW');
  }
  if (content.match(/\bB\b/)) {
    clusters.push('B');
  }
  if (content.includes('BI')) {
    clusters.push('BI');
  }
  if (content.includes('BY')) {
    clusters.push('BY');
  }
  if (content.match(/\bI\b/)) {
    clusters.push('I');
  }
  if (content.includes('IB')) {
    clusters.push('IB');
  }
  if (content.includes('IC')) {
    clusters.push('IC');
  }
  if (content.includes('IE')) {
    clusters.push('IE');
  }
  if (content.includes('IJ')) {
    clusters.push('IJ');
  }
  if (content.includes('IK')) {
    clusters.push('IJ');
  }
  if (content.match(/\bE\b/)) {
    clusters.push('E');
  }
  if (content.match(/\bF\b/)) {
    clusters.push('F');
  }
  if (content.match(/\bJ\b/)) {
    clusters.push('J');
  }
  if (content.match(/\bL\b/)) {
    clusters.push('L');
  }
  if (content.match(/\bM\b/)) {
    clusters.push('M');
  }
  if (content.match(/\bR\b/)) {
    clusters.push('R');
  }
  if (content.match(/\bS\b/)) {
    clusters.push('S');
  }
  if (content.match(/\bU\b/)) {
    clusters.push('U');
  }
  if (content.match(/\bW\b/)) {
    clusters.push('W');
  }
  return clusters;
}

async function formatDescription(description, status) {
  const endDesc = description.indexOf('</small>');
  let formatted = description;
  if (endDesc !== -1) {
    formatted = description.substring(
      // 22 equates for '<strong >' and '</strong > - '
      status.length + 22,
      // 8 equates to '</small>'
      endDesc + 8,
    );
  }
  formatted = formatted.replace(/\r?\n|\r/g, '<br />');
  return formatted;
}

async function formatBlockquote(status) {
  let blockquote;
  switch (status) {
    case 'investigating':
    case 'identified':
      blockquote = 'danger';
      break;
    case 'monitoring':
    case 'in progress':
      blockquote = 'warning';
      break;
    case 'resolved':
    case 'completed':
      blockquote = 'success';
      break;
    case 'scheduled':
      blockquote = 'info';
      break;
    default:
      blockquote = 'danger';
  }
  return blockquote;
}

async function postMessage(roomId, html) {
  webex.messages
    .create({
      html,
      roomId,
    })
    .catch((error) => {
      debug(error);
    });
}

async function parseMaintenance(item, status) {
  const output = {};
  debug('EVENT: MAINTENANCE');
  output.title = item.title;
  output.type = 'maintenance';
  output.clusters = await parseCluster(item.title);

  if (output.clusters.length > 0) {
    if (
      // eslint-disable-next-line operator-linebreak
      clusterFilter.length > 0 &&
      !output.clusters.some((c) => clusterFilter.includes(c))
    ) {
      debug(`Maint not relevant, only matching for ${clusterFilter}`);
      return;
    }
  }

  // If defined, identify Start/End Times
  const startIndex = item.description.indexOf('Start: ');
  if (startIndex !== -1) {
    const startEnd = item.description.indexOf('\r', startIndex);
    const startTime = item.description.substring(startIndex + 7, startEnd);
    output.startTime = startTime;
  }
  const endIndex = item.description.indexOf('Complete: ');
  if (endIndex !== -1) {
    const endEnd = item.description.indexOf('\r', endIndex);
    const endTime = item.description.substring(endIndex + 10, endEnd);
    output.endTime = endTime;
  }

  output.description = await formatDescription(item.description, status);
  output.blockquote = await formatBlockquote(status);
  output.guid = item.guid;

  let html = `<strong><a href=${output.guid}>${
    output.title
  }</a></strong><blockquote class="${
    output.blockquote
  }"><strong>Status: </strong>${status[0].toUpperCase()}${status.substring(1)}`;
  if (output.clusters.length > 0) {
    const clusters = output.clusters.join(', ');
    if (clusters.includes(',')) {
      html += `<br><strong>Clusters: </strong>${clusters}`;
    } else {
      html += `<br><strong>Cluster: </strong>${clusters}`;
    }
  }
  if (output.startTime && output.endTime) {
    html += `<br><strong>Start: </strong>${output.startTime}<br><strong>End: </strong>${output.endTime}`;
  }
  html += `<br><br>${output.description}`;

  await postMessage(process.env.MAINT_ROOM, html);
}

async function parseIncident(item, status) {
  const output = {};
  debug('EVENT: INCIDENT');
  output.title = item.title;
  output.type = 'incident';
  output.clusters = await parseCluster(item.title);
  output.description = await formatDescription(item.description, status);
  output.blockquote = await formatBlockquote(status);
  output.guid = item.guid;

  if (output.clusters.length > 0) {
    if (
      // eslint-disable-next-line operator-linebreak
      clusterFilter.length > 0 &&
      !output.clusters.some((c) => clusterFilter.includes(c))
    ) {
      debug(`Incident not relevant, only matching for ${clusterFilter}`);
      return;
    }
  }

  let html = `<strong><a href=${output.guid}>${
    output.title
  }</a></strong><blockquote class="${
    output.blockquote
  }"><strong>Status: </strong>${status[0].toUpperCase()}${status.substring(1)}`;
  if (output.clusters.length > 0) {
    const clusters = output.clusters.join(', ');
    if (clusters.includes(',')) {
      html += `<br><strong>Clusters: </strong>${output.clusters}`;
    } else {
      html += `<br><strong>Cluster: </strong>${output.clusters}`;
    }
  }
  html += `<br><br>${output.description}`;

  await postMessage(process.env.INC_ROOM, html);
}

async function parseAnnouncement(item) {
  const output = {};
  debug('EVENT: ANNOUNCEMENT');
  output.title = item.title;
  output.type = 'announcement';
  output.clusters = await parseCluster(item.title);
  output.description = await formatDescription(item.description, 22);
  // output.blockquote = await formatBlockquote(status);
  output.guid = item.guid;
  output.link = item.link;

  let html = `<strong><a href=${output.link}>${output.title}</a></strong><blockquote class="info">`;
  if (output.clusters.length > 0) {
    const clusters = output.clusters.join(', ');
    if (clusters.includes(',')) {
      html += `<br><strong>Clusters: </strong>${output.clusters}`;
    } else {
      html += `<br><strong>Cluster: </strong>${output.clusters}`;
    }
  }
  html += `${output.description}`;

  await postMessage(process.env.ANNOUNCE_ROOM, html);
}

// Process Incident Feed
incidentWatcher.on('new entries', (entries) => {
  entries.forEach((item) => {
    // Identify Item Type
    debug('new incident item');
    const typeIndex = item.description.indexOf('<strong >');
    if (typeIndex !== -1) {
      const typeEnd = item.description.indexOf('</strong >', typeIndex);
      const itemType = item.description.substring(typeIndex + 9, typeEnd);
      debug(`detected as ${itemType}`);
      switch (itemType) {
        case 'scheduled':
        case 'in progress':
        case 'completed':
          parseMaintenance(item, itemType);
          break;
        case 'resolved':
        case 'monitoring':
        case 'identified':
        case 'investigating':
          parseIncident(item, itemType);
          break;
        default:
          debug('EVENT: UNKNOWN');
          debug(item);
      }
    }
  });
});

// Process Announcement Feed
announcementWatcher.on('new entries', (entries) => {
  entries.forEach((item) => {
    debug('new announce item');
    parseAnnouncement(item);
  });
});

// Handle Incident Feed Errors
incidentWatcher.on('error', (error) => {
  debug(error);
});

// Handle Announcement Feed Errors
announcementWatcher.on('error', (error) => {
  debug(error);
});

// Init Function
async function init() {
  const bot = await webex.people.get('me');
  debug(`Bot Loaded: ${bot.displayName} (${bot.emails[0]})`);
  try {
    const incRoom = await webex.rooms.get(process.env.INC_ROOM);
    debug(`Inc Room: ${incRoom.title}`);
  } catch (error) {
    debug('ERROR: Bot is not a member of the Incident Room!');
    process.exit(2);
  }
  try {
    const maintRoom = await webex.rooms.get(process.env.MAINT_ROOM);
    debug(`Maint Room: ${maintRoom.title}`);
  } catch (error) {
    debug('ERROR: Bot is not a member of the Maintenance Room!');
    process.exit(2);
  }
  try {
    const announceRoom = await webex.rooms.get(process.env.ANNOUNCE_ROOM);
    debug(`Announce Room: ${announceRoom.title}`);
  } catch (error) {
    debug('ERROR: Bot is not a member of the Announcement Room!');
    process.exit(2);
  }
  incidentWatcher.start();
  announcementWatcher.start();
  debug('Startup Complete!');
}

// Initiate
init();

// Handle Graceful Shutdown (CTRL+C)
process.on('SIGINT', () => {
  debug('Stoppping...');
  incidentWatcher.stop();
  announcementWatcher.stop();
  debug('Feeds Stopped.');
});