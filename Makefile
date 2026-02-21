# Load project ref from .env
SUPABASE_PROJECT_REF := $(shell grep '^SUPABASE_PROJECT_REF=' .env 2>/dev/null | cut -d= -f2)

.PHONY: link
link:
	@if [ -z "$(SUPABASE_PROJECT_REF)" ]; then \
		echo "Error: SUPABASE_PROJECT_REF not found in .env"; exit 1; \
	fi; \
	echo "Linking to project ref: $(SUPABASE_PROJECT_REF)"; \
	supabase link --project-ref $(SUPABASE_PROJECT_REF)

