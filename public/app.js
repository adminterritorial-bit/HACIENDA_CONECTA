const button = document.querySelector("#calc");
const output = document.querySelector("#output");

button?.addEventListener("click", async () => {
  output.textContent = "Calculando...";
  const ciiu = document.querySelector("#ciiu").value.trim();
  const taxableIncomeCop = Number(document.querySelector("#income").value);
  const applyNoticesAndBoards = document.querySelector("#avisos").checked;

  try {
    const response = await fetch("/api/v1/calculate/ica", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        activities:[{ciiu,taxableIncomeCop}],
        applyNoticesAndBoards
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || "Error");
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = "No fue posible calcular: " + error.message;
  }
});
