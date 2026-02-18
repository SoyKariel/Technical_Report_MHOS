export const saveDraft = (data) => {
  localStorage.setItem("serviceDraft", JSON.stringify(data));
};

export const loadDraft = () => {
  const saved = localStorage.getItem("serviceDraft");
  return saved ? JSON.parse(saved) : null;
};
