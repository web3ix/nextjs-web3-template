import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import axios from "axios";
import {
	Balance,
	BalanceProps,
	BalanceProvider,
	Gas,
	GasProps,
	NetworkBalancesProps,
} from "../../../models/Balance";
import { LoopringAPI } from "../../loopring/LoopringAPI";
import { LOOPRING_URLs, LpFee } from "../../loopring/defs";
import { useSettingsState } from "../../../context/settings";

export default function useLoopringBalance(): BalanceProvider {
	const { networks } = useSettingsState();

	const supportedNetworks = [
		KnownInternalNames.Networks.LoopringMainnet,
		KnownInternalNames.Networks.LoopringGoerli,
	];

	const getNetworkBalances = async ({
		networkName,
		address,
	}: NetworkBalancesProps) => {
		const network = networks.find((n) => n.name === networkName);

		let balances: Balance[] = [];

		if (!network?.tokens) return;

		try {
			const account: { data: AccountInfo } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`
			);
			const accInfo = account.data;
			const tokens = network?.tokens?.map((obj) => obj.contract).join(",");
			const result: { data: LpBalance[] } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accInfo.accountId}&tokens=${tokens}`
			);

			const loopringBalances = network?.tokens?.map((asset) => {
				const amount = result.data.find(
					(d) => d.tokenId == Number(asset.contract)
				)?.total;
				return {
					network: network.name,
					token: asset?.symbol,
					amount: amount ? formatAmount(amount, Number(asset?.decimals)) : 0,
					request_time: new Date().toJSON(),
					decimals: Number(asset?.decimals),
					isNativeCurrency: false,
				};
			});

			balances = [...loopringBalances];
		} catch (e) {
			console.log(e);
		}

		return balances;
	};

	const getBalance = async ({ networkName, token, address }: BalanceProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!network) return;

		try {
			const account: { data: AccountInfo } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`
			);
			const accInfo = account.data;
			//:TODO set token in query params
			const result: { data: LpBalance[] } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accInfo.accountId}&tokens=`
			);

			const amount = result.data.find(
				(d) => d.tokenId == Number(token.contract)
			)?.total;

			return {
				network: network.name,
				token: token?.symbol,
				amount: amount ? formatAmount(amount, Number(token?.decimals)) : 0,
				request_time: new Date().toJSON(),
				decimals: Number(token?.decimals),
				isNativeCurrency: false,
			};
		} catch (e) {
			console.log(e);
		}
	};

	const getGas = async ({ token, address }: GasProps) => {
		let gas: Gas[] = [];
		try {
			const account: { data: AccountInfo } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`
			);
			const accInfo = account.data;

			const result: { data: LpFee } = await axios.get(
				`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accInfo.accountId}&requestType=3`
			);

			const formatedGas = formatAmount(
				result.data.fees.find((f) => f?.token === token.symbol)?.fee,
				Number(token.decimals)
			);

			gas = [
				{
					token: token.symbol,
					gas: formatedGas,
					request_time: new Date().toJSON(),
				},
			];
		} catch (e) {
			console.log(e);
		}

		return gas;
	};

	return {
		getNetworkBalances,
		getBalance,
		getGas,
		supportedNetworks,
	};
}

interface AccountInfo {
	accountId: number;
}

type PendingBalances = {
	withdraw: string;
	deposit: string;
};

type LpBalance = {
	accountId: number;
	tokenId: number;
	total: string;
	locked: string;
	pending: PendingBalances;
};
