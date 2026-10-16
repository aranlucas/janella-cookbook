import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/janella?schema=public";

afterEach(() => cleanup());
