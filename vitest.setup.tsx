import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Simula Next Image usando un <img> nativo en el entorno de testing
vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, sizes, priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));
