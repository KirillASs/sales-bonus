/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const revenue = sale_price * quantity * (1 - (discount / 100));
    return Number(revenue.toFixed(2));
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
    
    let bonus;
    if (index === 0) {
        bonus = profit * 0.15;
    } else if (index === 1 || index === 2) {
        bonus = profit * 0.10;
    } else if (index === total - 1) {
        bonus = 0;
    } else {
        bonus = profit * 0.05;
    }
    return Number(bonus.toFixed(2));
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
    
    if (!options || typeof options !== 'object') {
        throw new Error("Неверный формат данных");
    }
    
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error("Неверный формат данных");
    }
    
    if (!data || typeof data !== 'object') {
        throw new Error("Не хватает данных");
    }
    
    if (!data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error("Не хватает данных");
    }
    
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error("Не хватает данных");
    }
    
    if (!data.purchase_records || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error("Не хватает данных");
    }

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

    data.purchase_records.forEach(record => {
        const seller = sellersStats.find(s => s.id === record.seller_id);
        if (!seller) return;
        
        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            let profit = revenue - cost;
            // Округляем прибыль для каждого товара до 2 знаков
            profit = Number(profit.toFixed(2));
            
            // Накопление с округлением на каждом шаге
            seller.profit = Number((seller.profit + profit).toFixed(2));
            seller.revenue = Number((seller.revenue + revenue).toFixed(2));
            
            if (!seller.product_sold[item.sku]) {
                seller.product_sold[item.sku] = 0;
            }
            seller.product_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellersStats.sort((a, b) => b.profit - a.profit);
    
    // Расчет бонусов и топ-продуктов
    sellersStats.forEach((seller, index) => {
        // Бонус рассчитывается от округленной прибыли
        seller.bonus = calculateBonus(index, sellersStats.length, seller);
        
        seller.top_products = Object.entries(seller.product_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({
                sku: sku,
                quantity: quantity
            }));
    });

    return sellersStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus
    }));
}