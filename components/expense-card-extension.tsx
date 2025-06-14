{/* Bu bir geçici şirket seçim bileşeni dosyasıdır */}
// Gider kartlarında şirket seçimi için Select bileşeni
<div className="space-y-2 mt-4">
  <Label>Şirket</Label>
  <Select
    value={expense.companyId ?? "none"}
    onValueChange={(value) => {
      if (value === "none") {
        // "Şirket yok" seçildiğinde, şirket bilgilerini temizle
        updateExpense(expense.id, "companyId", undefined);
        updateExpense(expense.id, "companyName", undefined);
      } else {
        // Şirket seçildiğinde bilgileri güncelle
        updateExpense(expense.id, "companyId", value);
        // Seçilen firmanın adını da güncelle
        const selectedCompany = companies.find(company => company.id === value);
        if (selectedCompany) {
          updateExpense(expense.id, "companyName", selectedCompany.name);
        }
      }
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="Şirket seçin (isteğe bağlı)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Şirket yok</SelectItem>
      {companies.map((company) => (
        <SelectItem key={company.id} value={company.id}>
          {company.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
