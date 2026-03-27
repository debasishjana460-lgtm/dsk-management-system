declare module "html2canvas" {
  interface Options {
    backgroundColor?: string | null;
    scale?: number;
    useCORS?: boolean;
    [key: string]: unknown;
  }
  function html2canvas(
    element: HTMLElement,
    options?: Options,
  ): Promise<HTMLCanvasElement>;
  export default html2canvas;
}
