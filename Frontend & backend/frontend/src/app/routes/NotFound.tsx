import { Link } from "react-router";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="text-center">
        <div className="font-serif text-7xl brand-gradient-text">404</div>
        <h1 className="font-serif text-3xl mt-2">This page took a different path.</h1>
        <p className="text-muted-foreground mt-2">The link may be broken, or the page may have moved.</p>
        <div className="mt-5 flex gap-2 justify-center">
          <Link to="/"><Button variant="outline">Home</Button></Link>
          <Link to="/app"><Button>Open dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
