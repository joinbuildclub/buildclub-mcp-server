import app from "./app";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OAuthProvider from "@cloudflare/workers-oauth-provider";

const API_URL = "https://buildclub.io/api";

export class BuildClubMCPServer extends McpAgent {
  server = new McpServer({
    name: "BuildClub",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "list_events",
      "Retrieve a list of upcoming BuildClub.io events",
      {},
      async ({}) => {
        const events = await fetch(`${API_URL}/events?published=true`);
        const data: Event[] = await events.json();
        const stringifiedData = JSON.stringify(data);
        return {
          content: [{ type: "text", text: stringifiedData }],
        };
      }
    );

    this.server.tool(
      "get_event",
      "Retrieve a BuildClub.io event by UUID",
      { uuid: z.string() },
      async ({ uuid }) => {
        const event = await fetch(`${API_URL}/events/${uuid}`);
        const data: Event = await event.json();
        const stringifiedData = JSON.stringify(data);
        return {
          content: [{ type: "text", text: stringifiedData }],
        };
      }
    );

    this.server.tool(
      "event_registration",
      "Register for a BuildClub.io event by providing your first name, last name, email, and some optional notes for things like dietary restrictions and other needs",
      {
        hubEventId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        interestAreas: z.array(z.string()),
        notes: z.string(),
      },
      async ({
        hubEventId,
        firstName,
        lastName,
        email,
        interestAreas,
        notes,
      }) => {
        const response = await fetch(`${API_URL}/events/register`, {
          method: "POST",
          body: JSON.stringify({
            hubEventId,
            firstName,
            lastName,
            email,
            interestAreas,
            notes,
            isGuest: true,
          }),
        });
        const data: EventRegistration = await response.json();
        const stringifiedData = JSON.stringify(data);
        return {
          content: [{ type: "text", text: stringifiedData }],
        };
      }
    );
  }
}

// Export the OAuth handler as the default
export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: BuildClubMCPServer.mount("/sse"),
  defaultHandler: app,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

interface Event {
  id: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  eventType: string;
  focusAreas: string[];
  capacity: number | null;
  isPublished: boolean;
  hubId: string;
  hubEventId: string;
  createdAt: string;
  createdById: string | null;
}

interface EventRegistration {
  id: string;
  hubEventId: string;
  firstName: string;
  lastName: string;
  email: string;
  interestAreas: string[];
  isGuest: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
