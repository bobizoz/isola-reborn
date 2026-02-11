import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6dcc3] p-4">
      <div className="retro-box p-12 text-center max-w-md w-full space-y-6">
        <h1 className="font-pixel text-6xl text-primary mb-4">404</h1>
        <div className="w-full h-px bg-foreground/10 my-4" />
        <p className="font-retro text-xl text-muted-foreground">
          This island does not exist on our maps.
        </p>
        <Link href="/">
          <Button className="retro-btn w-full font-pixel mt-6">
            Return to Village
          </Button>
        </Link>
      </div>
    </div>
  );
}
