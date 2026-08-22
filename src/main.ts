import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// biome-ignore lint/suspicious/noConsole: Expected at app bootstrap
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
