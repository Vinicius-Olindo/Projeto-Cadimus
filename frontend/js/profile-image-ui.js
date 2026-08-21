// --- FOTO DE PERFIL: redimensiona e comprime no navegador antes de enviar ---
// Evita mandar fotos de celular (que podem vir com vários MB) pro backend;
// aqui já sai como base64 pequeno, do tamanho certo pra um avatar.
function comprimirImagemParaBase64(arquivo, ladoMaximo = 256, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
      imagem.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
        const largura = Math.round(imagem.width * escala);
        const altura = Math.round(imagem.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(imagem, 0, 0, largura, altura);

        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function definirPreviewFoto(dataUrl) {
  const preview = document.getElementById("preview-foto-perfil");
  const vazio = document.getElementById("avatar-vazio");
  const btnRemover = document.getElementById("btn-remover-foto");
  document.getElementById("nova-foto-perfil").value = dataUrl || "";

  // Sanitizar URL (data URLs de preview são permitidos, http/https também)
  const urlSegura = dataUrl && (dataUrl.startsWith("data:") || sanitizarUrl(dataUrl)) ? dataUrl : "";

  if (urlSegura) {
    preview.src = urlSegura;
    preview.style.display = "block";
    vazio.style.display = "none";
    btnRemover.style.display = "inline-block";
  } else {
    preview.src = "";
    preview.style.display = "none";
    vazio.style.display = "flex";
    btnRemover.style.display = "none";
  }
}
