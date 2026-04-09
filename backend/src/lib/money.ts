function formatMoney(cents: number, currency = "EUR") {
  const value = cents / 100;
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency,
  }).format(value);
}

export { formatMoney };
