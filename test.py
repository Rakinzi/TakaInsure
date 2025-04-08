from paynow import Paynow


paynow = Paynow(
    '20555', 
    '79df01b8-3975-4726-a2bf-e4a55e9c6bc8',
    'http://google.com', 
    'http://google.com'
    )

payment = paynow.create_payment('Order', 'silverrakinzi@gmail.com')

payment.add('Payment for stuff', 1)

response = paynow.send_mobile(payment, '0771111111', 'ecocash')


print(response.data)