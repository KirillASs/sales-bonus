/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    return sale_price * quantity * (1 - (discount / 100));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 * @throws {Error} при некорректных входных данных
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;
    
    // ... (все проверки валидации оставляем как были) ...
    if (!options || typeof options !== 'object') throw new Error("Неверный формат данных");
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") throw new Error("Неверный формат данных");
    if (!data || typeof data !== 'object') throw new Error("Не хватает данных");
    if (!data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0) throw new Error("Не хватает данных продавцов");
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) throw new Error("Не хватает данных товаров");
    if (!data.purchase_records || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) throw new Error("Не хватает данных покупок");

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Инициализируем в копейках (целые числа)
    const sellersStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenueCents: 0,   // Храним как целое число (копейки)
        profitCents: 0,     // Храним как целое число (копейки)
        sales_count: 0,
        product_sold: {}
    }));

    data.purchase_records.forEach(record => {
        const seller = sellersStats.find(s => s.id === record.seller_id);
        if (!seller) return;
        
        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            // ВАЖНО: Передаем в функцию расчета, но сразу конвертируем в копейки для накопления
            // Предполагаем, что calculateRevenue возвращает число с плавающей точкой
            const rawRevenue = calculateRevenue(item, product);
            
            // Конвертация в копейки с защитой от ошибок 0.1 + 0.2
            const revenueCents = Math.round(rawRevenue * 100);
            const costCents = Math.round(product.purchase_price * item.quantity * 100);
            const profitCents = revenueCents - costCents;
            
            seller.profitCents += profitCents;
            seller.revenueCents += revenueCents;
            
            if (!seller.product_sold[item.sku]) {
                seller.product_sold[item.sku] = 0;
            }
            seller.product_sold[item.sku] += item.quantity;
        });
    });

    // Конвертируем обратно в рубли только для сортировки и финального вывода
    sellersStats.forEach(seller => {
        seller.profit = seller.profitCents / 100;
        seller.revenue = seller.revenueCents / 100;
    });

    // Сортировка теперь происходит по чистым числам, полученным из целых копеек
    sellersStats.sort((a, b) => b.profit - a.profit);
    
    sellersStats.forEach((seller, index) => {
        // Бонус считаем от округленной прибыли (как в ТЗ)
        let bonus = calculateBonus(index, sellersStats.length, seller);
        
        // Округляем бонус до 2 знаков
        seller.bonus = Math.round(bonus * 100) / 100;
        
        seller.top_products = Object.entries(seller.product_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));
    });

    return sellersStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: seller.revenue, // Уже корректное число
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus
    }));
}