"use client";

import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { GlobalPatientSearch } from "./GlobalPatientSearch";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-6 gap-4 print:hidden">
      {/* Search */}
      <GlobalPatientSearch />

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
          </span>
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* User */}
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
              DR
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none text-foreground">Dr. Admin</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Administrator</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
