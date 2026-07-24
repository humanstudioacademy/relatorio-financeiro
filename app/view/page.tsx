import ViewerClient from "./ViewerClient";

// Renderizada em /relatorio_jul26.pdf (via rewrite no next.config.js).
export default function ViewPage() {
  return (
    <>
      {/* Fallback SEM JavaScript: pixel que dispara a coleta no servidor,
          registrando o acesso mesmo com JS desabilitado. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/log?nojs=1"
          alt=""
          width={1}
          height={1}
          style={{ position: "absolute", left: -9999, top: -9999 }}
        />
      </noscript>

      <ViewerClient />
    </>
  );
}
