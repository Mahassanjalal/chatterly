"use client";

import { useSearchParams } from "next/navigation";
import ChatInterface from "../../components/ChatInterface";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("connectionId");
  const isDirect = searchParams.get("direct") === "true";

  return (
    <ChatInterface 
      directConnectionId={connectionId || undefined}
      isDirectConnection={isDirect}
    />
  );
}
