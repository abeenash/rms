import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import { UIItem } from "../../hooks/useTableOrdering";
import Text from "../AppText";

const { width } = Dimensions.get("window")
export const CARD_WIDTH = (width - 44) / 2

interface ProductCardProps {
    item: UIItem;
    quantity: number;
    onAddToCart: (item: UIItem) => void
    colors: any
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
    item,
    quantity,
    onAddToCart,
    colors
}) => {
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onAddToCart(item)}
            style={[
                styles.productCard,
                {
                    backgroundColor: colors.cardBg,
                    borderColor: quantity > 0 ? colors.accentMain : colors.border
                }
            ]}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.image }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                />
                {quantity > 0 && (
                    <View style={[styles.floatingBadge, { backgroundColor: colors.accentMain }]}>
                        <Text style={styles.floatingBadgeText}>{quantity}</Text>
                    </View>
                )}
            </View>

            <View style={styles.productDetailsBox}>
                <Text numberOfLines={1} style={[styles.productName, { color: colors.textMain, fontWeight: "700" }]}>
                    {item.name}
                </Text>
                <Text numberOfLines={1} style={[styles.productDesc, { color: colors.textMuted }]}>
                    {item.description}
                </Text>
                <Text style={[styles.productPriceText, { color: colors.textMain, fontWeight: "700", marginTop: 4 }]}>
                    Rs. {item.price}
                </Text>
            </View>
        </TouchableOpacity>
    )
})

const styles = StyleSheet.create({
    productCard: {
        width: CARD_WIDTH,
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 110,
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    floatingBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    floatingBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "bold",
    },
    productDetailsBox: {
        padding: 12,
    },
    productName: {
        fontSize: 14,
    },
    productDesc: {
        fontSize: 11,
        marginTop: 2,
    },
    productPriceText: {
        fontSize: 13,
    },
})