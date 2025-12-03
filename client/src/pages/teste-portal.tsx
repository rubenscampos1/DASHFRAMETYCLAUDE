import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestePortal() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Teste Portal Mobile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">✅ React está funcionando</p>
          <p className="text-sm">✅ Wouter está funcionando</p>
          <p className="text-sm">✅ Token: {token || "Sem token"}</p>
          <p className="text-sm">✅ Tailwind está funcionando</p>
          <p className="text-sm">📱 User Agent: {navigator.userAgent.substring(0, 50)}...</p>
          <p className="text-sm">📐 Viewport: {window.innerWidth}x{window.innerHeight}</p>
        </CardContent>
      </Card>
    </div>
  );
}
