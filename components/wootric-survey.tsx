"use client"

import { useEffect } from "react"

export default function WootricSurvey( {user, token}:  {user: any, token: string}) {
    useEffect(() => {
        // Load the script dynamically
        const script = document.createElement("script");
        script.src = "https://cdn.wootric.com/wootric-sdk.js";
        script.async = true;
        script.onload = () => {
            if (window.wootric) {
                // window.wootric_survey_immediately = true
                window.wootricSettings = {
                    account_token: token, 
                    email: user.email, 
                    created_at: 1608123600,
                    // Other optional settings:
                    // language: 'en',
                    // product_name: 'Apoia',
                    // custom_questions: [{ question: 'What can we improve?', type: 'open-ended' }]
                }
                window.wootric('run');
            }
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [token, user.email]);

    return null; // No UI, just inject the script
}