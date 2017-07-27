import * as Router from 'koa-router';
import resolver from '../../resolver';

// THIS NEEDS TO BE A SEPARATE NPM MODULE
import auth from '../../lib/auth';

const indexRouter = new Router();
const appConfig = require('../../config/app');
const nano = require('nano')(appConfig.dbURL);

// consider a default ID token that directs to a designated identity's Hub data

indexRouter.post('/:id', function(ctx) {
  // DID or dan.id
  // Prove You Own It call. Where?

  resolver
    .resolve(this.params.id)
    .then(response => {
      // Locate a key to validate the request. Which one? Does the user specify, or is this standardized?
      var pubkey;
      response.ddo.owner.some(item => {
        if (item.type[1] == 'EdDsaPublicKey') {
          pubkey = item.publicKeyBase64;
          return true;
        }
      });
      // Validate it with a lib we use or create;
      auth
        .validate(pubkey, ctx.sig)
        .then(function() {
          // Check to see if the user already has a DB in Couch, if not create one/
          if (!nano.use(response.did)) {
            var services = response.ddo.service;
            if (services && services.hubs && services.hubs[0]) {
              nano.db.replicate(
                services.hubs[0],
                response.did,
                { create_target: true },
                function(err, body) {
                  if (!err) {
                    ctx.body = 'Syncing with existing Hubs';
                  }
                }
              );
            } else {
              nano.db.create(response.did, function(error, body) {
                if (!error) {
                  ctx.body = 'DB created for user';
                }
              });
            }
          } else {
            ctx.body = 'User already exists';
          }
        })
        .catch(function(error) {
          ctx.body = 'Request could not be validated';
        });
    })
    .catch(error => {
      ctx.body = 'Could not resolve';
    });
});

indexRouter.get('/:id', function(ctx) {
  // Ensure that there is an ID passed to the Hub

  resolver.resolve(this.params.id).then(response => {});

  ctx.body = JSON.stringify({
    routes: {
      extensions: {
        extensions: {
          rel: 'extension',
          href: appConfig.baseURL + '/extensions',
          action: 'GET'
        },
        extension: {
          rel: 'extension',
          href: appConfig.baseURL + '/extension/:id',
          action: 'GET'
        }
      }
    }
  });
});

import extensionsRouter from './extensions';
export { indexRouter, extensionsRouter };
