// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === '1') {
  Sentry.init({
    dsn: "https://b266ea35a9ed6e281997bfca92d559af@o4510119948451840.ingest.us.sentry.io/4510119949697024",

    ignoreErrors: [
      'Não foi possível acessar o processo',
      'You exceeded your current quota, please check your plan and billing details.',
      'Não foi possível obter o texto da peça no DataLake/Codex da PDPJ.',
      'Failed to fetch'
    ],

    // Add optional integrations for additional features
    // integrations: [Sentry.replayIntegration(),],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.001,
    // Enable logs to be sent to Sentry
    enableLogs: false,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    // replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    // replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;