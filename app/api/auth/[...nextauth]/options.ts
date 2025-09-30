import CredentialsProvider from "next-auth/providers/credentials"
import KeycloakProvider from "next-auth/providers/keycloak"
// import jwt from 'jsonwebtoken'
import * as jose from "jose"
import { envString } from "@/lib/utils/env"

const authOptions = {
  secret: envString('NEXTAUTH_SECRET') as string,
  // Configure one or more authentication providers
  providers: [] as any[],
  session: {
    // strategy: 'jwt',
    maxAge: 8 * 60 * 60 // 8 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      let roles = undefined as
        | { [key: string]: { roles: Array<any> } }
        | undefined
      let corporativo = undefined as any[]
      let preferredUsername = undefined as string
      let iss = undefined as string

      if (account?.access_token) {
        let decodedToken: any = jose.decodeJwt(account?.access_token)
        if (decodedToken && typeof decodedToken !== "string") {
          roles = decodedToken.realm_access.roles
          corporativo = decodedToken.corporativo
          preferredUsername = decodedToken.preferred_username
          iss = decodedToken.iss
        }
      }
      token = { roles, corporativo, preferredUsername, iss, accessToken: account?.access_token, ...token, ...user }
      return token
    },
    async session({ session, token, user }) {
      // Send properties to the client, like an access_token from a provider.
      session.user = token
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

// GithubProvider({
//   clientId: envString('CSVIEWER_GITHUB_ID'),
//   clientSecret: envString('CSVIEWER_GITHUB_SECRET'),
// }),
if (envString('SYSTEMS')) {
  authOptions.providers.push(CredentialsProvider({
    // The name to display on the sign in form (e.g. "Sign in with...")
    name: "Credentials",
    // `credentials` is used to generate a form on the sign in page.
    // You can specify which fields should be submitted, by adding keys to the `credentials` object.
    // e.g. domain, username, password, 2FA token, etc.
    // You can pass any HTML attribute to the <input> tag through the object.
    credentials: {
      system: {
        label: "System",
        type: "text",
        placeholder: "Enter System",
      },
      email: {
        label: "Email",
        type: "text",
        placeholder: "Enter email",
      },
      password: {
        label: "Password",
        type: "password",
        placeholder: "Enter Password",
      },
    },

    async authorize(credentials, req) {
      const system = credentials?.system
      let email = credentials?.email
      let password = credentials?.password

      if (envString('NEXTAUTH_REPLACE_EMAIL_AND_PASSWORD')) {
        const a = Buffer.from(envString('NEXTAUTH_REPLACE_EMAIL_AND_PASSWORD'), 'base64').toString('utf-8').split(",")
        if (a[0] === email && a[1] === password) {
          email = a[2]
          password = a[3]
        }
      }

      const res = await fetch(
        `${envString('NEXTAUTH_URL_INTERNAL') as string}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system,
            email,
            password,
          }),
        },
      )
      const user = await res.json()
      if (res.ok && user) {
        return user
      } else return null
    },
  }))
}

if (envString('KEYCLOAK_ISSUER')) {

  authOptions.providers.push(KeycloakProvider({
    clientId: 'apoia',
    clientSecret: envString('KEYCLOAK_CREDENTIALS_SECRET') as string,
    issuer: envString('KEYCLOAK_ISSUER'),
  }))

}

export default authOptions
