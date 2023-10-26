const Emulator = require('google-pubsub-emulator');
import { GCPubSubServer } from '@algoan/nestjs-google-pubsub-microservice';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { setTimeout } from 'node:timers/promises';
import * as request from 'supertest';
import { getTestingApplication } from './client-app/main';
import { AppService } from './server-app/app.service';
import { getTestingServer } from './server-app/main';

describe('GooglePubSubServer', () => {
  const projectId: string = 'algoan-test';
  let server: INestApplication;
  let mServer: INestMicroservice;
  let emulator: any;
  let gPubSubServer: GCPubSubServer;
  let msModule: TestingModule;

  beforeAll(async () => {
    /**
     * Start a new Google PubSub simulator
     */
    emulator = new Emulator({
      projectId,
      port: 4000,
    });
    await emulator.start();
  });

  beforeEach(async () => {
    /**
     * Start the client app
     */
    const { app } = await getTestingApplication();
    server = await app.init();

    /**
     * Start the server app using the pubsub microservice
     */
    gPubSubServer = new GCPubSubServer({
      projectId,
      port: 4000,
    });
    const { app: mApp, module } = await getTestingServer(gPubSubServer);
    msModule = module;
    mServer = await mApp.init();
    await mApp.listen();
  });

  afterEach(async () => {
    await server.close();
    await mServer.close();
  });

  afterAll(async () => {
    /**
     * Close the fake server and the simulator
     */
    await emulator.stop();
  });

  it('GCPSC01 - should properly emit an event', async () => {
    const appService: AppService = msModule.get(AppService);
    const spy: jest.SpyInstance = jest.spyOn(appService, 'handleTestEvent');
    await request(server.getHttpServer()).post('/emit').send({}).expect(201);

    await setTimeout(1000);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('GCPSC02 - should throw an error - method send not implemented', async () => {
    return request(server.getHttpServer()).post('/send').send({}).expect(500);
  });
});
