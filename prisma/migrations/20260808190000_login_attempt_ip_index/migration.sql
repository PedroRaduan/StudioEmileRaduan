-- Mantém a limitação de tentativas por endereço eficiente sem alterar os dados existentes.
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");
