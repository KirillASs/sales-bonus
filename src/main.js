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
    
    // Проверка наличия options
    if (!options || typeof options !== 'object') {
        throw new Error("Неверный формат данных");
    }
    
    // Проверка наличия и корректности опций
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error("Неверный формат данных");
    }
    
    // Проверка наличия data
    if (!data || typeof data !== 'object') {
        throw new Error("Не хватает данных");
    }
    
    // Проверка наличия и валидности sellers
    if (!data.sellers || !Array.isArray(data.sellers)) {
        throw new Error("Не хватает данных");
    }
    
    // Проверка наличия и валидности products
    if (!data.products || !Array.isArray(data.products)) {
        throw new Error("Не хватает данных");
    }
    
    // Проверка наличия и валидности purchase_records
    if (!data.purchase_records || !Array.isArray(data.purchase_records)) {
        throw new Error("Не хватает данных");
    }
    
    // Проверка на пустые массивы
    if (data.sellers.length === 0) {
        throw new Error("Не хватает данных");
    }
    
    if (data.products.length === 0) {
        throw new Error("Не хватает данных");
    }
    
    if (data.purchase_records.length === 0) {
        throw new Error("Не хватает данных");
    }

    // Индексация продавцов и товаров для быстрого доступа
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

    // Расчет выручки и прибыли для каждого продавца
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

    // Сортировка продавцов по прибыли и назначение премий
    sellersStats.sort((a, b) => b.profit - a.profit).forEach((seller, index) => {
        // Назначение бонуса
        seller.bonus = calculateBonus(index, sellersStats.length, seller);
        // Список топ 10
        seller.top_products = Object.entries(seller.product_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity], idx) => ({
                sku,
                quantity
            }));
    });

    // Подготовка итоговой коллекции с нужными полями
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