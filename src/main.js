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
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;
    
    // @TODO: Проверка входных данных
    if (!data || !data.purchase_records || !data.products || !data.sellers) {
        console.error("Не хватает данных");
        return [];
    }

    // @TODO: Проверка наличия опций
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        console.error("Неверный формат данных");
        return [];
    }

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        data.sellers.map(seller => [seller.id, seller])
    );
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    const sellersStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        product_sold: {}
    }));

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellersStats.find(s => s.id === record.seller_id);
        if (!seller) return;
        
        // Увеличить количество продаж
        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            // Посчитать себестоимость товара
            const cost = product.purchase_price * item.quantity;
            
            // Посчитать выручку с учетом скидки через функцию calculateRevenue
            // Передаём item (содержит sale_price, quantity, discount)
            const revenue = calculateRevenue(item, product);
            
            // Посчитать прибыль: выручка - себестоимость
            const profit = revenue - cost;
            
            // Увеличить общую накопленную прибыль у продавца
            seller.profit += profit;
            seller.revenue += revenue;
            
            // Учет количества проданных товаров
            if (!seller.product_sold[item.sku]) {
                seller.product_sold[item.sku] = 0;
            }
            seller.product_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли и назначение премий
    sellersStats.sort((a, b) => b.profit - a.profit).forEach((seller, index) => {
        // Назначение бонуса
        seller.bonus = calculateBonus(index, sellersStats.length, seller);
        // Список то 10
        seller.top_products = Object.entries(seller.product_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity], index) => ({
                rank: index + 1,
                sku: sku,
                quantity_sold: quantity
            }));
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellersStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}