# Integrações pendentes

## WhatsApp Business Platform

O produto não envia mensagens automáticas sem uma integração oficial. Para ativar lembretes será necessário:

1. Conta comercial verificada e provedor oficial escolhido.
2. Tokens e segredos cadastrados somente no ambiente seguro.
3. Webhook com validação de assinatura, idempotência e reprocessamento de falhas.
4. Consentimento de comunicação registrado para cada cliente.
5. Modelos aprovados pelo provedor e editáveis pela administradora.

Enquanto isso, o sistema prepara o texto, abre a conversa no WhatsApp e permite marcar manualmente o envio. Nenhum envio automático é inventado.

As mensagens preparadas podem incluir links seguros e de uso único para confirmação, cancelamento e solicitação de reagendamento. O link é gerado pelo próprio sistema; o envio continua manual até a contratação da integração oficial.

## Fotos, comprovantes e documentos

Antes de liberar uploads, configure armazenamento privado compatível com S3, validação de tipo e tamanho, antivírus e URLs temporárias. Fotos de procedimentos exigem consentimento específico.

## Pagamento on-line

O sistema permite configurar e registrar manualmente pagamento presencial e sinal. Pix automático, cartão on-line e confirmação por webhook devem entrar somente com um provedor contratado e reconciliação real. Nunca marque um pagamento como pago apenas pelo retorno do navegador.

## E-mail, SMS e notificações push

Os modelos e registros estão preparados, mas o envio depende da escolha de provedores, credenciais seguras, política de tentativas e monitoramento de falhas.
