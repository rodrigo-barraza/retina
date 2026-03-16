"use client";

import { use } from "react";
import ConversationsPage from "../page";

export default function ConversationDetailPage({ params }) {
  const { id } = use(params);
  return <ConversationsPage initialId={id} />;
}
