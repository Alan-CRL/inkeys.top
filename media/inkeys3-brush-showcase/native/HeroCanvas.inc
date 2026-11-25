// Draw3 离屏画布：在从不 Present 的 composition swapchain 上绘制一层并读回为 PNG。
namespace HeroCanvas
{
	using Path = std::filesystem::path;
	using Microsoft::WRL::ComPtr;
	using namespace Inkeys::Drawing::Draw3;

	struct Target
	{
		InkRenderer ink;
		ComPtr<IDXGISwapChain1> swapChain;
		ComPtr<ID3D11Texture2D> readable;
		ID3D11DeviceContext* context = nullptr;
		UINT width = 0, height = 0;

		bool Init(HeroExport::Context& log, ID3D11Device* device, ID3D11DeviceContext* deviceContext, UINT w, UINT h)
		{
			context = deviceContext; width = w; height = h;
			// dev 的 InkRenderer 需要真实交换链：建无 HWND 的 composition swapchain，从不连接 DComp、不 Present。
			ComPtr<IDXGIDevice> dxgi; ComPtr<IDXGIAdapter> adapter; ComPtr<IDXGIFactory2> factory;
			if (!log.Check(device->QueryInterface(IID_PPV_ARGS(&dxgi)), "dxgi-device")) return false;
			if (!log.Check(dxgi->GetAdapter(&adapter), "dxgi-adapter")) return false;
			if (!log.Check(adapter->GetParent(IID_PPV_ARGS(&factory)), "dxgi-factory")) return false;
			DXGI_SWAP_CHAIN_DESC1 desc{}; desc.Width = w; desc.Height = h;
			desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM; desc.SampleDesc.Count = 1;
			desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; desc.BufferCount = 2;
			desc.Scaling = DXGI_SCALING_STRETCH; desc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
			desc.AlphaMode = DXGI_ALPHA_MODE_PREMULTIPLIED;
			if (!log.Check(factory->CreateSwapChainForComposition(device, &desc, nullptr, &swapChain), "offscreen-swapchain")) return false;
			if (!log.Check(ink.Init(device, deviceContext, swapChain.Get(), w, h, D3D_DRIVER_TYPE_WARP, false), "draw3-renderer")) return false;
			D3D11_TEXTURE2D_DESC description{};
			ink.backBufferTexture->GetDesc(&description);
			description.Usage = D3D11_USAGE_STAGING; description.BindFlags = 0;
			description.CPUAccessFlags = D3D11_CPU_ACCESS_READ; description.MiscFlags = 0;
			return log.Check(device->CreateTexture2D(&description, nullptr, &readable), "draw3-readback");
		}

		void Begin()
		{
			ink.ClearRTV(ink.backBufferRTV.Get(), kTransparentLayerClearColor);
			ink.ClearOperatorLayer(ink.layerL0); ink.ClearOperatorLayer(ink.layerL1);
			ink.SetOperatorTarget(ink.layerL0);
		}

		bool Resolve(HeroExport::Context& log)
		{
			return log.Check(ink.ApplyOperatorLayers(ink.backBufferRTV.Get(), ink.layerL0, ink.layerL1,
				{ 0, 0, static_cast<LONG>(width), static_cast<LONG>(height) }), "draw3-resolve");
		}

		bool Save(HeroExport::Context& log, const Path& path)
		{
			context->OMSetRenderTargets(0, nullptr, nullptr);
			context->CopyResource(readable.Get(), ink.backBufferTexture.Get());
			D3D11_MAPPED_SUBRESOURCE map{};
			const HRESULT hr = context->Map(readable.Get(), 0, D3D11_MAP_READ, 0, &map);
			if (!log.Check(hr, "draw3-map")) return false;
			const HRESULT saved = HeroIo::SavePixels(path, width, height, map.RowPitch, static_cast<const BYTE*>(map.pData));
			context->Unmap(readable.Get(), 0);
			return log.Check(saved, "draw3-save");
		}

		~Target() { ink.ReleaseResources(); }
	};
}
