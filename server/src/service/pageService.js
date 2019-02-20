const Page = require('../models/page.js');
const AWS = require('aws-sdk');
const User = require('../models/user.js');
const Folder = require('../models/folder.js');
const s3 = new AWS.S3();
const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
AWS.config.credentials = credentials;
console.log("Credentials: ", credentials);
const bucket = process.env.S3_BUCKET;
import { buildPageForUpdateFromRequest } from '../models/creator/pageCreator';

export async function getPage(req, res) {
  return Page.find({ id: req.params.pageId }, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    return res.status(200).send(data);
  });
}

export async function getPagesWithTag(req, res) {
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const sort = req.query.sort ? req.query.sort : 'title';
  var query = { tags: req.query.tag };
  var options = {
    offset,
    limit,
    sort
  };
  return Page.paginate(query, options, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    return res.status(200).send(data);
  });
}

export async function savePageAsGuest(req, res) {
  try {
    const hydratedUser = await User.findOne({ name: 'peblioguest' }).exec();

    const page = new Page({ ...req.body, user: hydratedUser._id });
    const savedPage = await page.save();
    return res.status(200).send({ page: savedPage });
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

export async function savePage(req, res) {
  const user = req.user;
  if (!user) {
    return res.status(403).send({ error: 'Please log in first' });
  }
  try {
    const hydratedUser = await User.findOne({ _id: user._id }).exec();
    await User.update({ _id: user._id }, { pages: hydratedUser.pages.concat(req.body.id) }).exec();

    const page = new Page({ ...req.body, user: user._id });
    const savedPage = await page.save();
    return res.send({ page: savedPage });
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

export async function deletePage(req, res) {
  const { pageId } = req.params;
  try {
    await Page.deleteOne({ _id: pageId });
    return res.sendStatus(204);
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}

export async function updatePage(req, res) {
  const pageWithUpdatedData = buildPageForUpdateFromRequest(req);
  return Page.update({ id: req.body.id }, pageWithUpdatedData, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    } else {
      res.status(200).send({ data: 'Record has been Inserted..!!' });
      const fileName = `Snapshots/${req.body.id}.png`;
      const buffer = Buffer.from(req.body.image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      const params = {
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: 'img/png',
        ContentEncoding: 'base64',
        ACL: 'public-read'
      };
      var deleteParams = {
        Bucket: bucket,
        Key: fileName
       };
       s3.deleteObject(deleteParams, function(err, data) {
          s3.putObject(params, (err, response) => {
            return response
          });
      });
    }
  });
}

export function uploadPageSnapshotToS3(body, callback) {
  const img = body.image;
  const data = img.replace(/^data:image\/\w+;base64,/, "");
  //const buf = Buffer.from(data, 'base64');
  //fs.writeFileSync('image.png', buf);
  const fileName = `Snapshots/${body.id}.png`;
  const params = {
    Bucket: bucket,
    Key: fileName,
    Body: data,
    // ContentType: req.query.filetype,
    ACL: 'public-read'
  };
  s3.getSignedUrl('putObject', params, (err, data) => {
    if (err) {
      console.log(err);
      return null
    }
    callback(fileName);
  });
}

export async function movePage(req, res) {
  const user = req.user;
  if (!user) {
    return res.status(403).send({ error: 'Please log in first' });
  }
  if (!req.body) {
    return res.sendStatus(400);
  }

  const { pageId } = req.params;
  const { folderId } = req.body;

  try {
    const page = await Page.findOne({ _id: pageId }).exec();
    if (!page) {
      return res.status(404).send({ error: `Page with id ${pageId} not found` });
    }
    // if we're given a folder ID, move the page to that folder
    if (folderId) {
      // check if folder exists, but don't actually fetch the folder
      const folderCount = await Folder.count({ _id: folderId, user: user._id }).exec();
      if (!folderCount) {
        return res.status(404).send({ error: `Folder with id ${folderId} not found` });
      }
      page.folder = folderId;
      // otherwise, move the page to the top level (remove its folder ID)
    } else {
      page.folder = undefined;
      // could not use delete page.folder -
      // https://stackoverflow.com/questions/33239464/javascript-delete-object-property-not-working
    }
    const savedPage = await page.save();
    return res.status(200).send({ page: savedPage });
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
}


