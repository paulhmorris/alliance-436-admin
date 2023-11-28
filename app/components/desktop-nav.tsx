import { Form, Link, NavLink } from "@remix-run/react";
import { IconSettings } from "@tabler/icons-react";
import type { ComponentPropsWithoutRef } from "react";

import { ThemeModeToggle } from "~/components/theme-mode-toggle";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn, useUser } from "~/lib/utils";

export const links: ReadonlyArray<{
  name: string;
  href: string;
}> = [
  { name: "Add Donation", href: "/transactions/new" },
  { name: "Accounts", href: "/accounts" },
  { name: "Donors", href: "/donors" },
  { name: "Reimbursements", href: "/reimbursements" },
  { name: "Users", href: "/users" },
] as const;

export function DesktopNav(props: ComponentPropsWithoutRef<"nav">) {
  const user = useUser();

  return (
    <nav
      className={cn(
        "hidden h-full shrink-0 grow-0 basis-64 flex-col space-x-2 border-r border-border bg-background px-6 py-10 sm:flex",
        props.className,
      )}
    >
      <div className="pl-3">
        <Link to="/" className="inline-flex items-center space-x-2">
          <img src="/logo.jpg" alt="Logo" className="object-contain" />
        </Link>
      </div>
      <ul className="mt-12 space-x-0 space-y-1">
        {links.map((link) => {
          return (
            <li key={link.href}>
              <NavLink
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary",
                    isActive && "bg-secondary",
                  )
                }
              >
                {link.name}
              </NavLink>
            </li>
          );
        })}
      </ul>
      {["OWNER", "SUPERADMIN"].includes(user.role) ? (
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "mt-auto flex items-center rounded-md px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary",
              isActive && "bg-secondary",
            )
          }
        >
          <IconSettings className="mr-2 h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      ) : null}
      <Separator className="mb-8 mt-2" />
      <div className="space-y-4">
        <Link to={`/users/${user.id}`} className="flex gap-2">
          <Avatar>
            <AvatarFallback>
              {user.contact.firstName?.charAt(0).toUpperCase()}
              {user.contact.lastName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium text-secondary-foreground">
              {user.contact.firstName}
              {user.contact.lastName ? ` ${user.contact.lastName}` : null}
            </div>
            <div className="max-w-[150px] truncate text-xs text-muted-foreground">{user.contact.email}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Form method="post" action="/logout">
            <Button type="submit" variant="outline" className="sm:h-9">
              Log out
            </Button>
          </Form>
          <ThemeModeToggle />
        </div>
      </div>
    </nav>
  );
}
