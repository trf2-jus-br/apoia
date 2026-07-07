// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
if (process.env.NEXT_PUBLIC_SENTRY_DISABLED !== '1') {
  Sentry.init({
    dsn: "https://b266ea35a9ed6e281997bfca92d559af@o4510119948451840.ingest.us.sentry.io/4510119949697024",

    ignoreErrors: [
      'Não foi possível acessar o processo',
      'You exceeded your current quota, please check your plan and billing details.',
      'Não foi possível obter o texto da peça no DataLake/Codex da PDPJ.',
      'Failed to fetch'
    ],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.001,

    // Enable logs to be sent to Sentry
    enableLogs: false,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    beforeSend(event, hint) {
      const error = hint.originalException;

      // Verifica recursivamente se o erro ou qualquer causa tem skipSentry = true
      let currentError: any = error;
      while (currentError) {
        if (currentError.skipSentry === true) {
          return null; // Não envia para o Sentry
        }
        currentError = currentError.cause || currentError.causedBy;
      }

      return event;
    },
  });
}